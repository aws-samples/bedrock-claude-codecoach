'use client'

import { ChakraProvider } from '@chakra-ui/react'
import { RecoilRoot } from 'recoil'
import theme from '../theme'

import Footer from '../components/Footer'
import Navbar from '../components/Navbar'



export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  
  return (
    <html lang="en">
      <body>
        <RecoilRoot>
          <ChakraProvider theme={theme}>
            <Navbar />
            {children}
            <Footer />
          </ChakraProvider>
        </RecoilRoot>
      </body>
    </html>
  )
}