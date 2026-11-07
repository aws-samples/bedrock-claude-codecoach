import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { parse } from "yaml";

const read = (name: string) => fs.readFileSync(name, "utf8");
// cfn-lint checks intrinsic functions; here we inspect security properties.
const template = parse(read("cf-template.yaml"), { logLevel: "silent" });
const app = parse(read("docker-compose.yaml"));
const worker = parse(read("docker-compose.executor.yaml"));

describe("deployment trust boundaries", () => {
  it("keeps Piston off the application host and disables execution by default", () => {
    expect(Object.keys(app.services)).toEqual(["codecoach"]);
    expect(app.services.codecoach.privileged).not.toBe(true);
    expect(template.Parameters.EnableCodeExecution.Default).toBe("false");
    expect(read(".env.sample")).toContain('ENABLE_CODE_EXECUTION="false"');
    expect(read("Dockerfile")).not.toMatch(/^COPY \.env/m);
    expect(read(".dockerignore")).toContain(".env*");
  });

  it("gives the worker no instance role or metadata access", () => {
    const instance = template.Resources.ExecutorInstance;
    expect(instance.Condition).toBe("EnableExecutor");
    expect(instance.Properties.IamInstanceProfile).toBeUndefined();
    expect(instance.Properties.MetadataOptions.HttpEndpoint).toBe("disabled");
    const piston = worker.services.api;
    expect(piston.image).toMatch(/@sha256:[a-f0-9]{64}$/);
    expect(piston.environment.PISTON_DISABLE_NETWORKING).toBe("true");
    expect(Object.keys(piston.environment).some((key) => /AWS|AUTH|TOKEN|SECRET/.test(key))).toBe(false);
    expect(piston.volumes).toEqual(["./data/piston/packages:/piston/packages"]);
    expect(Number(piston.environment.PISTON_MAX_CONCURRENT_JOBS)).toBeLessThanOrEqual(2);
  });

  it("restricts public access to the application and private access to Piston", () => {
    const appIngress = template.Resources.InstanceSG.Properties.SecurityGroupIngress;
    expect(appIngress.find((rule) => rule.FromPort === 3000)).toHaveProperty("SourcePrefixListId");
    expect(appIngress.some((rule) => rule.FromPort === 2000)).toBe(false);
    const executorIngress = template.Resources.ExecutorSG.Properties.SecurityGroupIngress;
    expect(executorIngress.find((rule) => rule.FromPort === 2000)).toHaveProperty("SourceSecurityGroupId");
    for (const rule of [...appIngress, ...executorIngress]) expect(rule.CidrIp).not.toBe("0.0.0.0/0");
    expect(template.Resources.CloudFrontDist.Properties.DistributionConfig.DefaultCacheBehavior.ViewerProtocolPolicy).toBe("redirect-to-https");
  });

  it("removes account-wide managed policies and metadata mutation privileges", () => {
    const role = template.Resources.EC2Role.Properties;
    expect(role.ManagedPolicyArns).toBeUndefined();
    for (const policy of role.Policies) {
      for (const statement of policy.PolicyDocument.Statement) {
        expect(statement.Resource).not.toBe("*");
        for (const action of [statement.Action].flat()) {
          expect(action).not.toContain("*");
          expect(action).not.toBe("ec2:ModifyInstanceMetadataOptions");
        }
      }
    }
    expect(read("init.sh")).not.toContain("modify-instance-metadata-options");
    expect(template.Resources.MyEC2Instance.Properties.MetadataOptions.HttpTokens).toBe("required");
  });
});
