import { NextRequest, NextResponse } from 'next/server'
import { QueryPrompt, CreatePrompt, DeletePrompt } from "@utils/ddb"


/**
 * Handles GET requests to this API route
 * 
 * Checks for auth cookie containing current user data
 * If no user is authenticated, returns 403 error
 * 
 * If user is authenticated, calls QueryPrompt with user data
 * QueryPrompt returns the prompt for the user's conversation 
 * 
 * Returns prompt data in JSON response
*/
export async function GET(req: NextRequest) {

  const currentUser = req.cookies.get("auth")?.value
  const prompt = await QueryPrompt(JSON.parse(currentUser).user);
  return NextResponse.json(prompt);
}


/**
 * Handles POST requests to create a new prompt
 * 
 * Gets name and prompt data from request body
 * Gets current authenticated user data from auth cookie
 * 
 * Logs current user data to console
 * Calls CreatePrompt with user data, name, and prompt
 * CreatePrompt returns result of creating new prompt
 * 
 * Logs result to console
 * Returns JSON response indicating prompt was created
 */
export async function POST(req: NextRequest) {
  const { name, prompt } = await req.json();
  const currentUser = req.cookies.get("auth")?.value
  const result = await CreatePrompt(JSON.parse(currentUser).user, name, prompt)
  console.log(result)
  return NextResponse.json({ "status": `prompt [${name}] created successfully` });

}

/**
 * Handles DELETE requests to delete a prompt 
 * 
 * Gets promptID to delete from request body
 * Gets current authenticated user data from auth cookie
 * 
 * Validates:
 * - promptID is present
 * 
 * Calls DeletePrompt with current user data and promptID
 * DeletePrompt deletes the prompt for given user and ID
 * 
 * Logs result of deleting prompt to console
 * Returns JSON response indicating prompt was deleted
 * 
 * If any validation fails returns 403 error
 */
export async function DELETE(req: NextRequest) {
  try {
    const { promptID } = await req.json();
    const currentUser = req.cookies.get("auth")?.value

    if (!promptID) {
      return new Response("BAD Request", { status: 403 });
    }

    const result = await DeletePrompt(JSON.parse(currentUser).user, promptID)
    console.log(result)
    return NextResponse.json({ "status": `delete ${promptID} successfully` });

  } catch (e) { 
    return new Response("BAD Request", { status: 403 }); 
  }


}
