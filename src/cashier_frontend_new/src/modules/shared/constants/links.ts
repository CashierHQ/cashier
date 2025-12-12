export type LinkOrEmail = {
  label: string;
  url?: string;
  email?: string;
};

// Base links structure with URLs (labels will be translated via i18n)
const baseAppLinks: Record<string, Omit<LinkOrEmail, "label">> = {
  termsOfService: {
    url: "https://doc.clickup.com/9012452868/d/h/8cjy7g4-7212/01084c48b7877f0",
  },
  privacyPolicy: {
    url: "https://doc.clickup.com/9012452868/d/h/8cjy7g4-7232/38befdcfae1af1b",
  },
  team: {
    url: "https://doc.clickup.com/9012452868/d/h/8cjy7g4-4792/cd2e9646a3a8a0a",
  },
  about: {
    url: "https://doc.clickup.com/9012452868/d/h/8cjy7g4-4792/cd2e9646a3a8a0a",
  },
  aboutCashier: {
    url: "https://doc.clickup.com/9012452868/d/h/8cjy7g4-4292/9a3796b6e853ef0",
  },
  exploreCashier: {
    url: "https://doc.clickup.com/9012452868/d/h/8cjy7g4-4852/8a86f74b2d7ea73",
  },
  projectOverview: {
    url: "https://doc.clickup.com/9012452868/d/h/8cjy7g4-4292/9a3796b6e853ef0",
  },
  faq: {
    url: "https://doc.clickup.com/9012452868/d/h/8cjy7g4-4812/2b32fa3ed781459",
  },
  contactEmail: {
    email: "contact@cashierapp.io",
  },
};

// Function to get translated app links
export function getAppLinks(
  t: (key: string) => string,
): Record<string, LinkOrEmail> {
  return {
    termsOfService: {
      ...baseAppLinks.termsOfService,
      label: t("constants.termsOfService"),
    },
    privacyPolicy: {
      ...baseAppLinks.privacyPolicy,
      label: t("constants.privacyPolicy"),
    },
    team: {
      ...baseAppLinks.team,
      label: t("constants.team"),
    },
    about: {
      ...baseAppLinks.about,
      label: t("constants.about"),
    },
    aboutCashier: {
      ...baseAppLinks.aboutCashier,
      label: t("constants.aboutCashier"),
    },
    exploreCashier: {
      ...baseAppLinks.exploreCashier,
      label: t("constants.exploreCashier"),
    },
    projectOverview: {
      ...baseAppLinks.projectOverview,
      label: t("constants.projectOverview"),
    },
    faq: {
      ...baseAppLinks.faq,
      label: t("constants.faq"),
    },
    contactEmail: {
      ...baseAppLinks.contactEmail,
      label: t("constants.contactEmail"),
    },
  };
}
