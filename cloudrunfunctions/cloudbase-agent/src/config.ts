interface Config {
  envId: string;
  accessToken: string;
}

export default {
  envId: process.env.TCB_ENV_ID,
  accessToken: process.env.TCB_ACCESSTOKEN
} as Config
