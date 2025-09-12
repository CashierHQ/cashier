type LinkOrEmail = {
  label: string;
  url?: string;
  email?: string;
};

export const landingPageLinks: Record<string, LinkOrEmail> = {
  termsOfService: {
    label: "Terms of Service",
    url: "https://doc.clickup.com/9012452868/d/h/8cjy7g4-7212/01084c48b7877f0",
  },
  privacyPolicy: {
    label: "Privacy Policy",
    url: "https://doc.clickup.com/9012452868/d/h/8cjy7g4-7232/38befdcfae1af1b",
  },
  team: {
    label: "Team",
    url: "https://doc.clickup.com/9012452868/d/h/8cjy7g4-4792/cd2e9646a3a8a0a",
  },
  about: {
    label: "About Cashier",
    url: "https://app.clickup.com/9012452868/v/dc/8cjy7g4-4292",
  },
  faq: {
    label: "FAQ",
    url: "https://doc.clickup.com/9012452868/d/h/8cjy7g4-4812/2b32fa3ed781459",
  },
  contactEmail: {
    label: "Contact Email",
    email: "contact@cashierapp.io",
  },
};
