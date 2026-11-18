# Techtroopers Admin Access Setup

## Recommended Firestore structure

Create the admin document using the Firebase Authentication UID as its Firestore document ID:

`admins/{AUTH_UID}`

Fields:

- `email`: your Firebase Authentication email
- `role`: `admin`
- `active`: Boolean `true` (not the text/string `"true"`)
- `name`: optional

Using the authenticated UID as the document ID is preferred because Firestore Security Rules can verify the admin document with `exists()`.

You may alternatively use the exact email address as the admin document ID because this project also supports `admins/{EMAIL}`.

Avoid an auto-generated document ID when configuring a new administrator. The React app contains a legacy query fallback for such documents, but Firestore rules cannot safely use an arbitrary email-field query to authorize protected writes.

## After changing Firestore

1. Sign out of Techtroopers.
2. Sign in again with the same Firebase Authentication email.
3. Open `/admin`.
4. If you still see the student dashboard, clear this site's Local Storage or sign out/sign in again.

## Important code fix included

Older package builds returned the user object as `role` followed by `...profile`. If `users/{uid}` contained `role: "student"`, it overwrote the detected admin role. The corrected `AuthContext.jsx` spreads `profile` first and writes the computed `role` last, so the admin record wins.
