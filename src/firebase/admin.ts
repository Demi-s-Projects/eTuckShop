import admin from "firebase-admin";
//DO NOT UNDER ANY CIRCUMSTANCE IMPORT THIS INTO A CLIENT COMPONENT

function formatPrivateKey(key: string) {
	return key.replace(/\\n/g, "\n");
}

//this is what we need to setup to authorise all the firebase admin stuff
//firebase admin is an extension of us and thus bypasses security rules
//this is used to do more secure stuff away from the client
function initFirebaseAdmin() {
	if (admin.apps.length > 0) return; // already initialized

	//gets required admin credentials from the env file
	const projectId = process.env.FIREBASE_PROJECT_ID!;
	const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
	const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY!);

	//authorises the admin
	admin.initializeApp({
		credential: admin.credential.cert({
			projectId,
			clientEmail,
			privateKey,
		}),
		projectId,
	});
}

initFirebaseAdmin();

//exports all the admin services we'd need
export const adminAuth = admin.auth();
export const adminDB = admin.firestore();
export const adminMessaging = admin.messaging();
