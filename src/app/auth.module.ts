export const authStyles = {
	container: {
		maxWidth: 400,
		margin: "40px auto",
		padding: 24,
		border: "1px solid #eee",
		borderRadius: 8,
		background: "var(--background)",
	},
	title: {
		marginBottom: 24,
	},
	formGroup: {
		marginBottom: 16,
	},
	formGroupLast: {
		marginBottom: 24,
	},
	label: {
		display: "block",
		marginBottom: 8,
	},
	input: {
		width: "100%",
		padding: 8,
		border: "1px solid #ccc",
		borderRadius: 4,
	},
	button: {
		width: "100%",
		padding: 10,
		background: "#171717",
		color: "#fff",
		border: "none",
		borderRadius: 4,
		cursor: "pointer",
	},
	linkContainer: {
		marginTop: 16,
		textAlign: "center",
	},
	errorMEssage: {
		padding: 12,
		marginBottom: 16,
		background: "#fee",
		border: "1px solid #fcc",
		borderRadius: 4,
		color: "#c33",
	},
} as const;
