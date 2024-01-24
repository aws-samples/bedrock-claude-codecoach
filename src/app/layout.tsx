'use client'
import { I18nextProvider } from 'react-i18next';
import { ChakraProvider } from '@chakra-ui/react'
import { RecoilRoot } from 'recoil'
import theme from '../theme'

import Footer from '../components/Footer'
import Navbar from '../components/Navbar'




import i18n from '../i18n';


// i18n.init({
//   lng: 'en',
//   resources: {
//     en: {
//       translation: {
//         "Welcome to React": "Welcome to React and react-i18next"
//       }
//     },
//     fr: {
//       translation: {
//         "Welcome to React": "Bienvenue à React et react-i18next"
//       }
//     }
//   }
// });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  
  return (
    <html lang="en">
      <body>
        <RecoilRoot>
          <I18nextProvider i18n={i18n}>
          <ChakraProvider theme={theme}>
            <Navbar />
            {children}
            <Footer />
          </ChakraProvider>
         </I18nextProvider>
        </RecoilRoot>
      </body>
    </html>
  )
}