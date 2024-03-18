

import { atom } from "recoil";

import { recoilPersist } from 'recoil-persist'
const { persistAtom } = recoilPersist()


interface ChatMessage {
    question: string;
    image?:string;
    file?:string;
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


const awsProviderSettings =atom({
  key: 'awsProviderSettings',
  default: {"authType":"IAMROLE","aiRole":"CODECOACH","roleType":"system","model":"anthropic.claude-3-sonnet-20240229-v1:0"},
  effects_UNSTABLE: [persistAtom]
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


export {languageState,nameState, authState,runResult,awsProviderSettings,chatMessagesState,promptEditorResult, promptTemplateState}