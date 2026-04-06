import admin from "firebase-admin";
//DO NOT UNDER ANY CIRCUMSTANCE IMPORT THIS INTO A CLIENT COMPONENT

function formatPrivateKey(key?: string) {
	return (key || "").replace(/\\n/g, "\n");
}

function createUninitializedProxy<T>(serviceName: string): T {
	return new Proxy(
		{},
		{
			get() {
				throw new Error(
					`Firebase Admin ${serviceName} is not initialized. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.`
				);
			},
		}
	) as T;
}

//this is what we need to setup to authorise all the firebase admin stuff
//firebase admin is an extension of us and thus bypasses security rules
//this is used to do more secure stuff away from the client
function initFirebaseAdmin() {
	if (admin.apps.length > 0) return true; // already initialized

	//gets required admin credentials from the env file
	const projectId = process.env.FIREBASE_PROJECT_ID;
	const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
	const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

	if (!projectId || !clientEmail || !privateKey) {
		console.warn(
			"Firebase Admin not initialized: missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY."
		);
		return false;
	}

	//authorises the admin
	try {
		admin.initializeApp({
			credential: admin.credential.cert({
				projectId,
				clientEmail,
				privateKey,
			}),
			projectId,
		});
		return true;
	} catch (error) {
		console.error("Failed to initialize Firebase Admin:", error);
		return false;
	}
}

const isAdminInitialized = initFirebaseAdmin();

//exports all the admin services we'd need
export const adminAuth: admin.auth.Auth = isAdminInitialized
	? admin.auth()
	: createUninitializedProxy<admin.auth.Auth>("auth");
export const adminDB: admin.firestore.Firestore = isAdminInitialized
	? admin.firestore()
	: createUninitializedProxy<admin.firestore.Firestore>("firestore");
export const adminMessaging: admin.messaging.Messaging = isAdminInitialized
	? admin.messaging()
	: createUninitializedProxy<admin.messaging.Messaging>("messaging");
