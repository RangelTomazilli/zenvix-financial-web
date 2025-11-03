export const currentAppUrl = () => {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    return "http://localhost:3000";
  }
  return url.replace(/\/$/, "");
};
