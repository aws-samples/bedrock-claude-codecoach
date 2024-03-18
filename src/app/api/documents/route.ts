import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from 'crypto'; 

const securityCode="CodeCoach@#"
export async function DELETE(req: NextRequest) {
  const file = req.nextUrl.searchParams.get("file");

  const currentUser = JSON.parse (req.cookies.get("auth")?.value);
  const userSha1=crypto.createHash('sha1').update(`${securityCode}/${currentUser.user}`).digest('hex').substring(0, 32);



  if (!file) {
    return NextResponse.json({ error: "File not specified" }, { status: 400 });
  }

  const filePath = path.join("./uploads",`${userSha1}/`, file);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  fs.unlinkSync(filePath);

  return new NextResponse(null, { status: 200 });
}

export async function GET(req: NextRequest) {

  const currentUser = JSON.parse (req.cookies.get("auth")?.value);
    
  const userSha1=crypto.createHash('sha1').update(`${securityCode}/${currentUser.user}`).digest('hex').substring(0, 32);

  console.log(userSha1) 

  if (
    req.method === "GET" &&
    req.nextUrl.pathname.startsWith("/api/documents")
  ) {
    const uploadsDir = `./uploads/${userSha1}`;

    // Check if uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      return NextResponse.json({ files: [] });
    }

    // Read files from uploads directory
    const files = fs.readdirSync(uploadsDir);

    // Get file details (name and size)
    const fileDetails = files.map((file) => {
      const filePath = path.join(uploadsDir, file);
      const stats = fs.statSync(filePath);
      return {
        file: file,
        size: stats.size,
      };
    });

    return NextResponse.json({files:fileDetails});
  }

  // Return 404 for other routes
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}


export async function POST(req: NextRequest) {
    const currentUser = JSON.parse (req.cookies.get("auth")?.value);
    const userSha1=crypto.createHash('sha1').update(`${securityCode}/${currentUser.user}`).digest('hex').substring(0, 32);

    if (
      req.method === "POST" &&
      req.nextUrl.pathname.startsWith("/api/documents")
    ) {
      const formData = await req.formData();
      const file = formData.get("file") as File;
  
      const filePath = `./uploads/${userSha1}/${file.name}`;
  
      // Create uploads folder if needed
      const uploadDir = path.join('./uploads', userSha1);

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

  
      // Save file
      const uint8Array = await file.arrayBuffer();
      const buffer = Buffer.from(uint8Array);
  
      fs.writeFileSync(filePath, buffer);
  
      return NextResponse.json({
        status: "ok",
        file: file.name,
        size: buffer.length,
      });
    }

    return NextResponse.json({ error: "File not found" }, { status: 404 });

  }