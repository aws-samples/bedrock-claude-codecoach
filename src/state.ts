

import { atom } from "recoil";

import { recoilPersist } from 'recoil-persist'
const { persistAtom } = recoilPersist()


interface ChatMessage {
    question: string;
    reply: string;
    costToken?:number;
  }

interface PromptTemplate {
    name: string;
    promptTemplate: string;
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

const promptEditorResult =atom({
  key: 'promptEditorResult',
  default: '',
  effects_UNSTABLE: [persistAtom]
})


const authSettings =atom({
  key: 'authSettings',
  default: {"authType":"IAMROLE","aiRole":"CODECOACH","roleType":"system"},
})

const languageState =atom({
  key: 'languageState',
  default: 'en',
  effects_UNSTABLE: [persistAtom]
})
  
const chatMessagesState = atom<ChatMessage[]>({
    key: 'chatMessagesState',
    default: [],
    effects_UNSTABLE: [persistAtom]
  });

const promptTemplateState = atom<PromptTemplate[]>({
    key: 'promptTemplateState',
    default: [],
    effects_UNSTABLE: [persistAtom]
  });


export {languageState,nameState, authState,runResult,authSettings,chatMessagesState,promptEditorResult, promptTemplateState}