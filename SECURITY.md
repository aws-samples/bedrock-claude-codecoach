# Security and migration

CodeCoach executes untrusted code only in an explicitly enabled, offline worker.
Do not deploy the previous single-instance application/Piston configuration.

## Security boundaries

- Every business API verifies a signed session and its DynamoDB session record,
  independently of Next.js middleware. Sessions expire after one hour. Logout
  deletes the session; changing a password invalidates all earlier sessions.
- Set a unique `AUTH_SECRET` of at least 32 random bytes for each deployment.
  Keep it in the root-owned `.env.local` runtime file or your secret manager.
  It must not be a `NEXT_PUBLIC_*` variable or part of a Docker image. All
  application replicas must use the same secret and session table.
- Production cookies use `HttpOnly`, `Secure`, and `SameSite=Strict`. Browser
  mutations check their origin. Use HTTPS; local HTTP development uses
  `yarn dev`. The production Docker application also expects HTTPS at its
  ingress. CloudFront redirects viewers to HTTPS.
- New passwords use salted scrypt. Existing SHA-256 passwords are upgraded on
  successful login. The old public `admin@demo.com` demo password is rejected;
  an operator must reset that account before it can be used.
- Application IAM access is limited to its table/index and the listed regional
  Bedrock models. Account discovery, arbitrary AWS CLI execution and instance
  metadata mutation permissions have been removed.

## Optional code execution

Execution is disabled by default and requires an authenticated administrator.
CloudFormation's `EnableCodeExecution=true` provisions a **separate EC2 worker**,
with no instance profile and with IMDS disabled. This adds an EC2 instance and
EBS storage to the deployment cost. The application uses the worker's private IP;
the worker security group accepts port 2000 only from the application group.

`docker-compose.yaml` runs only the application. The separate
`docker-compose.executor.yaml` is for a dedicated worker. Piston requires a
privileged container: **never run that Compose file on the application host or
any host containing AWS credentials, secrets, or sensitive workloads**. Do not
mount application directories, host credential files or a Docker socket into
the worker. The checked-in image is pinned by digest.

Piston disables networking for both compilation and execution and enforces CPU,
memory, output and concurrency limits. Jobs receive no application cookies or
AWS credentials. Shell and AWS CLI requests are unsupported. Python and other
languages can also send network requests, so the language list is not a security
boundary. Do not re-enable job networking to work around a failed example.
Package installation runs through the worker's local management API, outside
the job sandbox.

The trusted application instance requires IMDSv2 with hop limit 2 to obtain its
limited role inside Docker. Untrusted execution has moved to a different VM
where IMDS is disabled and no role exists. Reducing the application hop limit
to 1 without another application credential provider would break AWS calls.
Do not rely on security groups or an SDK environment variable to block IMDS.

For a custom worker, use the same isolation, remove public port access, disable
IMDS, and set both `ENABLE_CODE_EXECUTION=true` and `PISTON_SERVER_URL` on the
application. An application URL setting cannot verify a worker's isolation.
Run the acceptance checks below before enabling it.

## Deploy a new installation

The CloudFormation template uses a default VPC with public subnets in
`us-west-2` or `us-east-1`. Supply:

- `SSHKeyName`: an existing SSH key.
- `SSHLocation`: your trusted administrator IPv4 CIDR, preferably a single `/32`.
- `CloudFrontPrefixListId`: the regional
  `com.amazonaws.global.cloudfront.origin-facing` managed prefix list ID.
- `AdminEmail`: your administrator email.
- `SourceRevision`: the reviewed repository commit containing this fix. The
  default `main` is for development; production should pin an immutable commit.

Look up the prefix list with your deployment credentials:

```sh
aws ec2 describe-managed-prefix-lists \
  --filters Name=prefix-list-name,Values=com.amazonaws.global.cloudfront.origin-facing \
  --query 'PrefixLists[0].PrefixListId' --output text
```

CloudFormation creates a dedicated DynamoDB table with the existing PK/SK and
SK-index schema, point-in-time recovery and TTL on `expiresAt`. Application
session expiry does not depend on eventual DynamoDB TTL deletion.

The initializer generates a unique administrator password and stores it in
`/root/codecoach-credentials` on the application instance, readable only by root.
Retrieve it through your trusted SSH connection, sign in over HTTPS, and change
it. The initializer never logs the password or overwrites an existing account.
Session secrets are generated on the instance and excluded from Docker builds.

For local application development, copy `.env.sample` to `.env.local`, generate
`AUTH_SECRET` with `openssl rand -hex 32`, select an existing application table
and AWS region, then run `corepack yarn install --frozen-lockfile` and
`corepack yarn dev`. Provision the table with deployment credentials rather
than granting table creation permissions to the application role.

On an initialized application instance, an operator can create or reset an
account with a generated password:

```sh
sudo bash init.sh -u person@example.com guest
sudo bash init.sh --reset-user person@example.com admin
```

The reset command invalidates existing sessions for that account. It deliberately
does not accept passwords in command-line arguments.

## Existing deployment migration and customer impact

These changes require a migration. Updating repository files or EC2 UserData
alone does **not** retrofit an existing running deployment.

1. Restrict the old deployment's ingress and stop accepting execution requests.
   Remove public access to Piston, including paths that bypass CloudFront.
   Preserve relevant logs and investigate the old role's AWS activity.
2. Back up the existing DynamoDB table and copy uploads out of the old
   application container **before removing it**. Existing deployments stored
   uploads inside `/app/uploads`; the new application persists them in
   `data/uploads`, owned by UID/GID 1001. User directory names are preserved.
3. Deploy the reviewed revision, passing the existing table name through
   `ExistingTableName` (typically `bedrock-claude-codecoach`). This prevents
   creation of an empty replacement table and scopes the new IAM role to the
   existing table. For that external table, enable TTL on `expiresAt` using
   deployment credentials; expired sessions are rejected even before cleanup.
4. Transfer the saved uploads to the new application's `data/uploads`, restore
   ownership, and reset any account still using the public demo password.
   Existing users and prompts remain in the selected table. Other legacy
   passwords migrate on login.
5. All old unsigned cookies become invalid; users must sign in again.
   Programmatic callers must obtain a session from `/api/signin` and retain its
   cookie. Base64 settings in an Authorization header do not authenticate a
   caller. Logout now uses `POST /signout`.
6. Chat and prompt generation remain available. Server-side AWS CLI execution is
   removed. Offline execution is optional and administrator-only; downloading
   packages or contacting APIs from submitted code will fail. Existing custom
   models must be reviewed and added to the IAM model resource list.
7. Verify the new deployment before switching traffic. Retire the old
   application/Piston host and remove its broad role permissions. If credential
   exposure is suspected, follow incident response procedures to revoke affected
   role sessions and replace exposed secrets. Stopping Piston does not revoke
   credentials that may already have been obtained.

Use the restricted, execution-disabled deployment as the rollback state. Do not
restore public execution or unsigned-cookie authentication.

## Verification and production review

Repository checks:

```sh
corepack yarn test
corepack yarn typecheck
corepack yarn build
cfn-lint cf-template.yaml
shellcheck init.sh init-executor.sh scripts/install-docker.sh
docker compose --env-file .env.local config --quiet
docker compose -f docker-compose.executor.yaml config --quiet
```

The automated suite exercises real route handlers and session cryptography with
mocked AWS/Piston dependencies. It does not prove isolation on an EC2 deployment.
Before production, verify in an owned staging account:

- Anonymous, forged, expired and revoked cookies fail on every API, including
  direct requests carrying middleware-bypass headers.
- Login, logout, password changes, prompts, uploads and Bedrock streaming work;
  one user cannot access another user's resources.
- With execution disabled, no job reaches Piston. If enabled, a simple Python
  job succeeds while requests to IMDS, the application host and external HTTP
  endpoints fail from submitted code. Check both compile and run stages.
  Test only connectivity/status; do not log or export metadata credentials.
- The executor has no instance profile or secrets, IMDS is disabled, and port
  2000 is inaccessible from the internet. Only CloudFront can reach application
  port 3000. Confirm the deployed IAM permissions match the intended table and
  model list, and verify timeout/concurrency/resource limits.
- Confirm legacy data is intact and the previous deployment is no longer
  reachable. EC2 user-data completion and worker runtime installation must be
  checked separately from CloudFormation's stack completion status.

The security ticket requires customer impact review and approval from leadership
and the AppSec Affinity Engineer **before production deployment**. Record those
approvals and staging results in the ticket. Actual customer/account exposure,
incident response, named action-item owners and ECDs must be supplied by the
responsible teams; a repository patch cannot establish them.

The template retains HTTP between CloudFront and the restricted EC2 origin.
Deployments requiring encryption on that connection should provision a
certificate-backed HTTPS origin before production.
