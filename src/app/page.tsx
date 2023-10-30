
'use client'

import {useState, useEffect} from "react";
import { useRecoilState} from "recoil"

import Link  from 'next/link'

import {
  Flex,
  Container,
  Heading,
  Stack,
  Text,
  Button,
  Image,
} from '@chakra-ui/react'


import { nameState} from "../state"

export default function CallToActionWithIllustration() {
  const [name, setName] = useRecoilState(nameState)
  
  const [isClient, setIsClient] = useState(false)

 
  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <Container maxW={'5xl'}>
      <Stack
        textAlign={'center'}
        align={'center'}
        spacing={{ base: 8, md: 10 }}
        py={{ base: 20, md: 28 }}>
        <Heading
          fontWeight={600}
          fontSize={{ base: '3xl', sm: '4xl', md: '6xl' }}
          lineHeight={'110%'}>
          Code Should Be{' '}
          <Text as={'span'} color={'orange.400'}>
            Easy
          </Text>
        </Heading>
        <Text color={'gray.500'} maxW={'3xl'}>
         {isClient&&(name!=="")&&(<>Hello , {name} ! </> ) } 
         Explore the future of coding education with our AI Code Coach app. Get personalized guidance, real-time feedback, and expert suggestions to enhance your coding skills. Experience a new level of learning and unleash your coding potential with our AI-powered platform.
        </Text>
        <Stack spacing={6} direction={'row'}>
        <Link href="signin">
          <Button
            px={6}
            w={"10vw"}
            colorScheme={'orange'}
            bg={'orange.400'}
           
            _hover={{ bg: 'orange.500' }}>
            Get Start
          </Button>{'   '}
         
        </Link>
        
        </Stack>
        <Flex w={'50vw'} justifyContent="center" alignItems="center">
        
        </Flex>
      </Stack>
    </Container>
  )
}


