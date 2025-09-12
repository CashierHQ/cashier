type LinkOrEmail = {
  label: string;
  url?: string;
  email?: string;
};

export const landingPageLinks: Record<string, LinkOrEmail> = {
  termsOfService: {
    label: "landing_page.link.term_of_service",
    url: "https://doc.clickup.com/9012452868/d/h/8cjy7g4-7212/01084c48b7877f0",
  },
  privacyPolicy: {
    label: "landing_page.link.privacy_policy",
    url: "https://doc.clickup.com/9012452868/d/h/8cjy7g4-7232/38befdcfae1af1b",
  },
  team: {
    label: "landing_page.link.team",
    url: "https://doc.clickup.com/9012452868/d/h/8cjy7g4-4792/cd2e9646a3a8a0a",
  },
  about: {
    label: "landing_page.link.about",
    url: "https://doc.clickup.com/9012452868/d/h/8cjy7g4-4292/9a3796b6e853ef0",
  },
  faq: {
    label: "landing_page.link.faq",
    url: "https://doc.clickup.com/9012452868/d/h/8cjy7g4-4812/2b32fa3ed781459",
  },
  contactEmail: {
    label: "landing_page.link.contact_email",
    email: "contact@cashierapp.io",
  }
};
