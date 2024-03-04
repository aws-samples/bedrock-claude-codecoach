"use client";

import { useEffect, useState } from 'react'
import { useRecoilState } from 'recoil'

import Link  from 'next/link'
import { useRouter } from 'next/navigation'


import {
  Box,
  Flex,
  Text,
  IconButton,
  Button,
  Stack,
  Collapse,
  Icon,
  Popover,
  PopoverTrigger,
  PopoverContent,
  useColorModeValue,
  useBreakpointValue,
  useDisclosure,
} from '@chakra-ui/react'
import {
  HamburgerIcon,
  CloseIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@chakra-ui/icons'


import {IoLogInOutline,IoLogOutOutline} from "react-icons/io5"
import { MdOutlineLanguage } from "react-icons/md";


import {DarkModeSwitch} from "./DarkModeSwitch"
import { authState,languageState } from '../state'


import Setting from "./Setting"
import { useTranslation } from 'react-i18next'




export default function Navbar() {
  const { isOpen, onToggle } = useDisclosure()

  const [auth,setAuth]=useRecoilState(authState)
  const [isClient, setClient]=useState(false)
  const router = useRouter()

  const { t,i18n} = useTranslation();
  // const [language, setLanguage] =useState("en")
  const [language,setLanguage] =useRecoilState(languageState)

  const handChangeLanguge =()=>{
    if (language === "en") {
      setLanguage("zh")
      i18n.changeLanguage("zh")
    }else{
      setLanguage("en")
      i18n.changeLanguage("en")
    }

    console.log(language)
  }

  useEffect(()=>{
    setClient(true);
    i18n.changeLanguage(language)
  },[auth])

  const handleSignOut=()=>{
    setAuth(null)
    fetch('/signout', {
      method: 'GET',
    })
      .then(response => {
        if (response.ok) {
          // Logout successful
          console.log('Successfully logged out');
        } else {
          // Logout failed
          console.log('Logout failed');
        }
      })
      .catch(error => {
        console.error('Error during logout:', error);
      });
    router.push("/")
    
  }

  return (
    <Box>
      <Flex
        bg={useColorModeValue('white', 'gray.800')}
        color={useColorModeValue('gray.600', 'white')}
        minH={'60px'}
        py={{ base: 2 }}
        px={{ base: 4 }}
        borderBottom={1}
        borderStyle={'solid'}
        borderColor={useColorModeValue('gray.200', 'gray.900')}
        align={'center'}>
        <Flex
          flex={{ base: 1, md: 'auto' }}
          ml={{ base: -2 }}
          display={{ base: 'flex', md: 'none' }}>
          <IconButton
            onClick={onToggle}
            icon={isOpen ? <CloseIcon w={3} h={3} /> : <HamburgerIcon w={5} h={5} />}
            variant={'ghost'}
            aria-label={'Toggle Navigation'}
          />
        </Flex>
        <Flex flex={{ base: 1 }} justify={{ base: 'center', md: 'start' }}>
          <Text
            textAlign={useBreakpointValue({ base: 'center', md: 'left' })}
            fontFamily={'heading'}
            color={useColorModeValue('gray.800', 'white')}>
            Code Coach @powered by Amazon Bedrock 
          </Text>

          <Flex display={{ base: 'none', md: 'flex' }} ml={10}>
            <DesktopNav />
          </Flex>
        </Flex>
        
        <Stack
          flex={{ base: 1, md: 0 }}
          justify={'flex-end'}
          direction={'row'}
          spacing={6}>
          
          <Button fontSize={'sm'} fontWeight={400} variant={'link'} >
          {isClient&&(auth?.user??"")}
          </Button>
          {isClient&&auth&&<Setting/>}
          <DarkModeSwitch/>
          
          </Stack>

         

        <Stack
          flex={{ base: 1, md: 0 }}
          justify={'flex-end'}
          direction={'row'}
          spacing={6}>
            
         <Link href="#">
            <IconButton
            icon={<MdOutlineLanguage/>}
            aria-label=""
            onClick={handChangeLanguge}
          />
          </Link>
          {isClient&&!auth&&
          <Link href="/signin">
          <IconButton
            onClick={onToggle}
            icon={<IoLogInOutline/>}
            aria-label={'Toggle Navigation'}
          />
          </Link>
          }
          {isClient&&auth&&
          <a href="#">
            <IconButton
            icon={<IoLogOutOutline/>}
            aria-label={'Toggle Navigation'}
            onClick={handleSignOut}
          />
          </a>
          }
         
        </Stack>
      </Flex>

      <Collapse in={isOpen} animateOpacity>
        <MobileNav />
      </Collapse>
    </Box>
  )
}

const DesktopNav = () => {
  const linkColor = useColorModeValue('gray.600', 'gray.200')
  const linkHoverColor = useColorModeValue('gray.800', 'white')
  const popoverContentBgColor = useColorModeValue('white', 'gray.800')
  
  const {t} = useTranslation();

  return (
    <Stack direction={'row'} spacing={4}>
      {NAV_ITEMS.map((navItem) => (
        <Box key={navItem.label}>
          <Popover trigger={'hover'} placement={'bottom-start'}>
            <PopoverTrigger>
              <Box
                as="a"
                p={2}
                href={navItem.href ?? '#'}
                fontSize={'sm'}
                fontWeight={500}
                color={linkColor}
                target={navItem.isExternal ? '_blank' : undefined}
                _hover={{
                  textDecoration: 'none',
                  color: linkHoverColor,
                }}>
                 {t(navItem.label)}
              </Box>
            </PopoverTrigger>

            {navItem.children && (
              <PopoverContent
                border={0}
                boxShadow={'xl'}
                bg={popoverContentBgColor}
                p={4}
                rounded={'xl'}
                minW={'sm'}>
                <Stack>
                  {navItem.children.map((child) => (
                    <DesktopSubNav key={child.label} {...child} />
                  ))}
                </Stack>
              </PopoverContent>
            )}
          </Popover>
        </Box>
      ))}
    </Stack>
  )
}

const DesktopSubNav = ({ label, href, subLabel }: NavItem) => {
  return (
    <Box
      as="a"
      href={href}
      role={'group'}
      display={'block'}
      p={2}
      rounded={'md'}
      _hover={{ bg: useColorModeValue('blue.50', 'gray.900') }}>
      <Stack direction={'row'} align={'center'}>
        <Box>
          <Text
            transition={'all .3s ease'}
            _groupHover={{ color: 'green.400' }}
            fontWeight={500}>
            {label}
          </Text>
          <Text fontSize={'sm'}>{subLabel}</Text>
        </Box>
        <Flex
          transition={'all .3s ease'}
          transform={'translateX(-10px)'}
          opacity={0}
          _groupHover={{ opacity: '100%', transform: 'translateX(0)' }}
          justify={'flex-end'}
          align={'center'}
          flex={1}>
          <Icon color={'pink.400'} w={5} h={5} as={ChevronRightIcon} />
        </Flex>
      </Stack>
    </Box>
  )
}

const MobileNav = () => {
  return (
    <Stack bg={useColorModeValue('white', 'gray.800')} p={4} display={{ md: 'none' }}>
      {NAV_ITEMS.map((navItem) => (
        <MobileNavItem key={navItem.label} {...navItem} />
      ))}
    </Stack>
  )
}

const MobileNavItem = ({ label, children, href }: NavItem) => {
  const { isOpen, onToggle } = useDisclosure()

  return (
    <Stack spacing={4} onClick={children && onToggle}>
      <Box
        py={2}
        as="a"
        href={href ?? '#'}
        justifyContent="space-between"
        alignItems="center"
        _hover={{
          textDecoration: 'none',
        }}>
        <Text fontWeight={600} color={useColorModeValue('gray.600', 'gray.200')}>
          {label}
        </Text>
        {children && (
          <Icon
            as={ChevronDownIcon}
            transition={'all .25s ease-in-out'}
            transform={isOpen ? 'rotate(180deg)' : ''}
            w={6}
            h={6}
          />
        )}
      </Box>

      <Collapse in={isOpen} animateOpacity style={{ marginTop: '0!important' }}>
        <Stack
          mt={2}
          pl={4}
          borderLeft={1}
          borderStyle={'solid'}
          borderColor={useColorModeValue('gray.200', 'gray.700')}
          align={'start'}>
          {children &&
            children.map((child) => (
              <Box as="a" key={child.label} py={2} href={child.href}>
                {child.label}
              </Box>
            ))}
        </Stack>
      </Collapse>
    </Stack>
  )
}

interface NavItem {
  label: string
  subLabel?: string
  children?: Array<NavItem>
  href?: string
  isExternal?:boolean
}

const NAV_ITEMS: Array<NavItem> = [
  {
    label: 'Home',
    href: '/',
  },
  {
    label: 'Chat',
    href: '/chat',
  },
  {
    label: 'Prompt Editor',
    href: '/prompt'
  },
  // {
  //   label: 'Search(beta)',
  //   href: '/search'
  // },
  {
    label: 'Github',
    href: 'https://github.com/aws-samples/bedrock-claude-codecoach',
    isExternal: true
  },
  
]