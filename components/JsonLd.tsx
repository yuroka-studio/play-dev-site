import { absoluteUrl, apps, paths, site, type Locale } from "@/lib/config";

/** Structured data for the home page: the studio as an Organization, the site, and one SoftwareApplication per app. */
export function JsonLd({ locale }: { locale: Locale }) {
  const org = absoluteUrl("/#studio");
  const developer = { "@type": "Organization", name: site.developerName, url: site.websiteUrl, email: site.contactEmail };
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": org,
        name: site.studioName,
        alternateName: site.developerName,
        url: site.websiteUrl,
        email: site.contactEmail,
        description: site.about[locale],
      },
      { "@type": "WebSite", "@id": absoluteUrl("/#website"), url: site.websiteUrl, name: site.studioName, inLanguage: locale, publisher: { "@id": org } },
      ...apps.map((app) => ({
        "@type": "SoftwareApplication",
        "@id": absoluteUrl(`/#${app.id}`),
        name: app.name,
        description: app.description[locale],
        url: app.playUrl ?? app.webUrl ?? absoluteUrl(`${paths.home(locale)}#app-${app.id}`),
        operatingSystem: "Android",
        applicationCategory: "MobileApplication",
        author: developer,
        publisher: developer,
        isPartOf: { "@id": org },
      })),
    ],
  };
  // "<" is escaped so that no value can close the script element
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
