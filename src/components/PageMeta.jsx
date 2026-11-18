import { Helmet } from "react-helmet-async";

export default function PageMeta({ title, description }) {
  return (
    <Helmet>
      <title>
        {title ? `${title} | Techtroopers` : "Techtroopers Learning Platform"}
      </title>

      <link
        rel="icon"
        type="image/png"
        href="/logo.png"
      />

      <meta
        name="description"
        content={
          description ||
          "Techtroopers learning platform"
        }
      />
    </Helmet>
  );
}