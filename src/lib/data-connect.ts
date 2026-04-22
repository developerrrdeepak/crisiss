import { getApp, getApps, initializeApp } from "firebase-admin/app";
import { getDataConnect, type DataConnect } from "firebase-admin/data-connect";

type GlobalDataConnectState = typeof globalThis & {
  __hospitalityDataConnectClient?: DataConnect;
};

function readConfigValue(key: "DATA_CONNECT_SERVICE_ID" | "DATA_CONNECT_LOCATION" | "DATA_CONNECT_CONNECTOR") {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

export function isDataConnectConfigured() {
  return Boolean(readConfigValue("DATA_CONNECT_SERVICE_ID") && readConfigValue("DATA_CONNECT_LOCATION"));
}

function getDataConnectConfig() {
  const serviceId = readConfigValue("DATA_CONNECT_SERVICE_ID");
  const location = readConfigValue("DATA_CONNECT_LOCATION");
  const connector = readConfigValue("DATA_CONNECT_CONNECTOR");

  if (!serviceId || !location) {
    throw new Error(
      "Firebase Data Connect is not configured. Set DATA_CONNECT_SERVICE_ID and DATA_CONNECT_LOCATION."
    );
  }

  return connector ? { serviceId, location, connector } : { serviceId, location };
}

export function getDataConnectClient() {
  const globalStore = globalThis as GlobalDataConnectState;

  if (!globalStore.__hospitalityDataConnectClient) {
    const app = getApps().length > 0 ? getApp() : initializeApp();
    globalStore.__hospitalityDataConnectClient = getDataConnect(getDataConnectConfig(), app);
  }

  return globalStore.__hospitalityDataConnectClient;
}

export async function executeDataConnectRead<
  Response,
  Variables extends Record<string, unknown> | undefined = undefined,
>(query: string, variables?: Variables) {
  const response = await getDataConnectClient().executeGraphqlRead<Response, Variables>(query, {
    variables,
  });

  return response.data;
}

export async function executeDataConnectMutation<
  Response,
  Variables extends Record<string, unknown> | undefined = undefined,
>(query: string, variables?: Variables) {
  const response = await getDataConnectClient().executeGraphql<Response, Variables>(query, {
    variables,
  });

  return response.data;
}
