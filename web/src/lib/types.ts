export interface LinkMap {
  linkedin: string | null;
  github: string | null;
  existingPortfolio: string | null;
  x: string | null;
}

export interface EducationEntry {
  degree: string;
  field: string;
  institution: string | null;
  start: string | null;
  end: string | null;
  note?: string | null;
}

export interface Profile {
  name: string;
  displayName: string;
  shortName: string;
  initials: string;
  kicker: string;
  headline: string;
  tagline: string;
  status: string;
  statusDetail: string;
  intro: string;
  about: string[];
  rotatingIdentities: string[];
  technicalInterests: string[];
  email: string;
  location: string | null;
  availability: string;
  links: LinkMap;
  resume: {
    path: string;
    label: string;
    lastUpdated?: string | null;
    generated?: boolean;
  };
  portrait: {
    src: string | null;
    alt: string;
    note?: string;
    uploadedAt?: string;
  };
  education: EducationEntry[];
}

export interface HeroLabel {
  text: string;
  value: string;
}

export interface HeroContent {
  eyebrow: string;
  scrollCue: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; action: string };
  resumeCta: { label: string; href: string };
  portraitLabels: HeroLabel[];
}

export interface Audience {
  id: "recruiter" | "engineer" | "founder" | "student" | "visitor";
  label: string;
  blurb: string;
}

export interface Skill {
  id: string;
  name: string;
  kind: string;
  what: string;
  how: string;
  relatedProjects: string[];
  relatedExperience: string[];
}

export interface SkillCategory {
  id: string;
  index: string;
  label: string;
  color: "cyan" | "violet" | "mint" | "silver" | string;
  summary: string;
  skills: Skill[];
}

export interface ExperienceEntry {
  id: string;
  org: string;
  role: string;
  type: string;
  start: string | null;
  end: string | null;
  current: boolean;
  location: string | null;
  summary: string | null;
  responsibilities: string[];
  technologies: string[];
  learnings: string[];
  achievements: string[];
  note?: string | null;
}

export interface ProjectScreenshot {
  src: string;
  alt: string;
  caption?: string;
}

export interface Project {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  status: string;
  year: string | null;
  featured: boolean;
  verified: boolean;
  summary: string | null;
  problem: string | null;
  whyItMatters: string | null;
  architecture: string | null;
  stack: string[];
  implementation: string | null;
  challenges: string[];
  decisions: string[];
  screenshots: ProjectScreenshot[];
  video: string | null;
  github: string | null;
  live: string | null;
  lessons: string[];
  future: string[];
  note?: string | null;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date?: string | null;
  url?: string | null;
  note?: string | null;
}

export interface BeyondPrinciple {
  index: string;
  title: string;
  body: string;
}

export interface Beyond {
  headline: string;
  standfirst: string;
  paragraphs: string[];
  principles: BeyondPrinciple[];
  interests: string[];
  photographs: { src: string; alt: string; caption?: string }[];
  note?: string;
}

export interface BuildLogEntry {
  id: string;
  date: string;
  title: string;
  body: string;
  kind: string;
}

export interface AssistantContent {
  name: string;
  tagline: string;
  disclaimer: string;
  suggestedQuestions: string[];
  fallbackNotice: string;
  greeting: string;
}

export interface SEOContent {
  title: string;
  titleTemplate: string;
  description: string;
  keywords: string[];
  siteUrl: string;
  locale: string;
}

export interface PortfolioContent {
  meta: {
    schemaVersion: number;
    updatedAt: string;
    notice?: string;
    revision?: string;
  };
  profile: Profile;
  hero: HeroContent;
  audiences: Audience[];
  skills: SkillCategory[];
  toolkit: string[];
  experience: ExperienceEntry[];
  projects: Project[];
  certifications: Certification[];
  beyond: Beyond;
  buildLog: BuildLogEntry[];
  assistant: AssistantContent;
  seo: SEOContent;
}
