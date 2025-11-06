export type LinkOrEmail = {
  label: string;
  url?: string;
  email?: string;
};

export const appLinks: Record<string, LinkOrEmail> = {
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
    label: "About us",
    url: "https://doc.clickup.com/9012452868/d/h/8cjy7g4-4792/cd2e9646a3a8a0a",
  },
  aboutCashier: {
    label: "About Cashier",
    url: "https://doc.clickup.com/9012452868/d/h/8cjy7g4-4292/9a3796b6e853ef0",
  },
  exploreCashier: {
    label: "Explore Cashier",
    url: "https://doc.clickup.com/9012452868/d/h/8cjy7g4-4852/8a86f74b2d7ea73",
  },
  projectOverview: {
    label: "Cashier project overview",
    url: "https://doc.clickup.com/9012452868/d/h/8cjy7g4-4292/9a3796b6e853ef0",
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
