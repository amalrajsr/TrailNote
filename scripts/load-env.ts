import * as nextEnvNamespace from "@next/env";

const nextEnv = nextEnvNamespace as typeof nextEnvNamespace & {
  default?: typeof nextEnvNamespace;
};

(nextEnv.loadEnvConfig ?? nextEnv.default?.loadEnvConfig)(process.cwd());
