"use client";

import { useState, useEffect } from "react";
import { useSetRecoilState } from "recoil";
import { useRouter } from "next/navigation";
import { useTranslation } from 'react-i18next'

import {
  Button,
  Checkbox,
  Flex,
  Text,
  FormControl,
  FormLabel,
  Heading,
  Input,
  InputGroup,
  InputRightElement,
  Stack,
  Image,
} from "@chakra-ui/react";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";

import { authState } from "../../state";
import AlertInfo from "../../components/AlertInfo";

interface User {
  email: string;
  password: string;
}

const baseURL = process.env.NEXT_PUBLIC_API_SERVER_URL || "";

async function Post(user: User) {
  const response = await fetch(`${baseURL}/api/signin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(user),
  });

  const data = await response.json();
  if ("role" in data) {
    console.log("Auth success!");
  } else {
    console.log("Auth failure!");
  }

  return data;
}

const SigninScreen = () => {
  const [user, setUser] = useState<User>({ email: "", password: "" });
  const [isAuth, setAuth] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const setAuthState = useSetRecoilState(authState);

  const {t} = useTranslation();

  const handIsOpen = (open: boolean) => {
    console.log("andIsOpen invoke", open);
    setIsOpen(open);
  };

  useEffect(() => {
    if (isAuth) {
      router.push("/chat");
    }
    console.log(isAuth);
  }, [isAuth]);

  function handleClick() {
    console.log(
      `User login !  email : ${user.email}, password : ${user.password}`
    );
    Post(user).then((res) => {
      if ("role" in res) {
        setAuthState(res);
        setAuth(true);
        console.log("Redirect to chat!");
      } else {
        setIsOpen(true);
      }
    });
  }

  return (
    <>
      <AlertInfo
        isOpen={isOpen}
        setIsOpen={handIsOpen}
        delayClose={5}
        title="SignIn information: "
        desc="auth failed!"
        status="error"
      />

      <Stack minH={"100vh"} direction={{ base: "column", md: "row" }}>
        <Flex p={8} flex={1} align={"center"} justify={"center"}>
          <Stack spacing={4} w="full" maxW={"md"}>
            <Heading fontSize={"2xl"}>{t('Sign in to your account')}</Heading>
            <FormControl id="email">
              <FormLabel>{t('Email address')}</FormLabel>
              <Input
                type="email"
                value={user.email}
                onChange={(e) => {
                  setUser({ ...user, email: e.target.value });
                }}
              />
            </FormControl>
            <FormControl id="password" isRequired>
              <FormLabel>{t('Password')}</FormLabel>
              <InputGroup>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={user.password}
                  onChange={(e) => {
                    setUser({ ...user, password: e.target.value });
                  }}
                />
                <InputRightElement h={"full"}>
                  <Button
                    variant={"ghost"}
                    onClick={() =>
                      setShowPassword((showPassword) => !showPassword)
                    }
                  >
                    {showPassword ? <ViewIcon /> : <ViewOffIcon />}
                  </Button>
                </InputRightElement>
              </InputGroup>
            </FormControl>
            <Stack spacing={6}>
              <Stack
                direction={{ base: "column", sm: "row" }}
                align={"start"}
                justify={"space-between"}
              >
                <Checkbox>{t('Remember me')}</Checkbox>
                <Text color={"blue.500"}>{t('Forgot password')}?</Text>
              </Stack>
              <Button
                colorScheme={"blue"}
                variant={"solid"}
                onClick={handleClick}
              >
                {t('Sign in')}
              </Button>
            </Stack>
          </Stack>
        </Flex>
        <Flex flex={1}>
          <Image
            alt={"Login Image"}
            objectFit={"cover"}
            src={"/images/photo-sigin-background.avif"}
          />
        </Flex>
      </Stack>
    </>
  );
};

export default SigninScreen;
