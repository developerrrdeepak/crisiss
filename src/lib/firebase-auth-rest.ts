function getFirebaseWebApiKey() {
  const apiKey =
    process.env.FIREBASE_PUBLIC_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "FIREBASE_PUBLIC_API_KEY or NEXT_PUBLIC_FIREBASE_API_KEY is required for guest credential provisioning."
    );
  }

  return apiKey;
}

export async function createFirebaseEmailPasswordUser(params: {
  email: string;
  password: string;
  displayName?: string;
}) {
  const apiKey = getFirebaseWebApiKey();

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: params.email,
        password: params.password,
        returnSecureToken: true,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    const message =
      data?.error?.message || "Failed to provision Firebase guest credentials.";
    throw new Error(message);
  }

  return {
    uid: data.localId as string,
    email: data.email as string,
    idToken: data.idToken as string,
    refreshToken: data.refreshToken as string,
    displayName: params.displayName ?? null,
  };
}
