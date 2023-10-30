

import { atom } from "recoil";

import { recoilPersist } from 'recoil-persist'
const { persistAtom } = recoilPersist()

interface ChatMessage {
    question: string;
    reply: string;
    costToken?:number;
  }

const nameState =atom({
    key: 'nameState',
    default: '',
    effects_UNSTABLE: [persistAtom]
})

const authState =atom({
    key: 'authState',
    default: {},
    effects_UNSTABLE: [persistAtom]
})


const runResult =atom({
  key: 'runResult',
  default: '',
})


const authSettings =atom({
  key: 'authSettings',
  default: {"authType":"IAMROLE","akValue":"","skValue":"","cognitoIDValue":"","cognitoRegionValue":"us-east-1"},
})


  
export const chatMessagesState = atom<ChatMessage[]>({
    key: 'chatMessagesState',
    default: [],
    effects_UNSTABLE: [persistAtom]
  });

export {nameState, authState,runResult,authSettings}