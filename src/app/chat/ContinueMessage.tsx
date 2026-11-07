"use client";

import { Text } from "@chakra-ui/react";

// Generated AWS commands can be copied and reviewed in the user's own AWS
// environment. The application never lends its instance role to executed code.
export default function ContinueMessage(_props: { question: string; reply: string }) {
  return <Text fontSize="sm">Review and run AWS commands in your own environment.</Text>;
}
