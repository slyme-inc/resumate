export type SkillCategory =
  | "language"
  | "frontend"
  | "backend"
  | "mobile"
  | "database"
  | "cloud"
  | "devops"
  | "data"
  | "tool";

export const CATEGORY_LABELS: Record<SkillCategory, string> = {
  language: "Languages",
  frontend: "Frontend",
  backend: "Backend",
  mobile: "Mobile",
  database: "Databases",
  cloud: "Cloud",
  devops: "DevOps",
  data: "Data & AI",
  tool: "Tools",
};

export type Skill = {
  id: string;
  label: string;
  category: SkillCategory;
  aliases: string[];
  /**
   * Short or dictionary-word names ("go", "r", "c") produce constant false
   * positives in prose, so they only count inside structured context such as
   * job tags or a résumé skills section.
   */
  ambiguous?: boolean;
};

export const SKILLS: Skill[] = [
  // Languages
  { id: "typescript", label: "TypeScript", category: "language", aliases: ["typescript", "ts"] },
  { id: "javascript", label: "JavaScript", category: "language", aliases: ["javascript", "js", "ecmascript"] },
  { id: "python", label: "Python", category: "language", aliases: ["python", "python3"] },
  { id: "java", label: "Java", category: "language", aliases: ["java", "java8", "j2ee"] },
  { id: "csharp", label: "C#", category: "language", aliases: ["c#", "csharp", "c sharp"] },
  { id: "cpp", label: "C++", category: "language", aliases: ["c++", "cpp"] },
  { id: "c", label: "C", category: "language", aliases: ["c"], ambiguous: true },
  { id: "go", label: "Go", category: "language", aliases: ["golang", "go lang", "go"], ambiguous: true },
  { id: "rust", label: "Rust", category: "language", aliases: ["rust"] },
  { id: "ruby", label: "Ruby", category: "language", aliases: ["ruby"] },
  { id: "php", label: "PHP", category: "language", aliases: ["php"] },
  { id: "scala", label: "Scala", category: "language", aliases: ["scala"] },
  { id: "kotlin", label: "Kotlin", category: "language", aliases: ["kotlin"] },
  { id: "swift", label: "Swift", category: "language", aliases: ["swift"] },
  { id: "elixir", label: "Elixir", category: "language", aliases: ["elixir"] },
  { id: "r", label: "R", category: "language", aliases: ["r"], ambiguous: true },
  { id: "bash", label: "Bash", category: "language", aliases: ["bash", "shell scripting", "shell"] },

  // Frontend
  { id: "react", label: "React", category: "frontend", aliases: ["react", "react.js", "reactjs"] },
  { id: "nextjs", label: "Next.js", category: "frontend", aliases: ["next.js", "nextjs"] },
  { id: "vue", label: "Vue", category: "frontend", aliases: ["vue", "vue.js", "vuejs"] },
  { id: "angular", label: "Angular", category: "frontend", aliases: ["angular", "angularjs"] },
  { id: "svelte", label: "Svelte", category: "frontend", aliases: ["svelte", "sveltekit"] },
  { id: "html", label: "HTML", category: "frontend", aliases: ["html", "html5"] },
  { id: "css", label: "CSS", category: "frontend", aliases: ["css", "css3", "scss", "sass"] },
  { id: "tailwind", label: "Tailwind CSS", category: "frontend", aliases: ["tailwind", "tailwindcss"] },
  { id: "redux", label: "Redux", category: "frontend", aliases: ["redux"] },
  { id: "webpack", label: "Webpack", category: "frontend", aliases: ["webpack", "vite", "rollup"] },

  // Backend
  { id: "nodejs", label: "Node.js", category: "backend", aliases: ["node.js", "nodejs", "node"] },
  { id: "express", label: "Express", category: "backend", aliases: ["express", "express.js", "expressjs"] },
  { id: "nestjs", label: "NestJS", category: "backend", aliases: ["nestjs", "nest.js"] },
  { id: "django", label: "Django", category: "backend", aliases: ["django"] },
  { id: "flask", label: "Flask", category: "backend", aliases: ["flask"] },
  { id: "fastapi", label: "FastAPI", category: "backend", aliases: ["fastapi"] },
  { id: "spring", label: "Spring", category: "backend", aliases: ["spring", "spring boot", "springboot"] },
  { id: "rails", label: "Ruby on Rails", category: "backend", aliases: ["rails", "ruby on rails"] },
  { id: "laravel", label: "Laravel", category: "backend", aliases: ["laravel"] },
  { id: "dotnet", label: ".NET", category: "backend", aliases: [".net", "dotnet", "asp.net", ".net core"] },
  { id: "graphql", label: "GraphQL", category: "backend", aliases: ["graphql"] },
  { id: "rest", label: "REST APIs", category: "backend", aliases: ["rest", "rest api", "restful", "rest apis"] },
  { id: "grpc", label: "gRPC", category: "backend", aliases: ["grpc"] },
  { id: "microservices", label: "Microservices", category: "backend", aliases: ["microservices", "microservice"] },

  // Mobile
  { id: "react-native", label: "React Native", category: "mobile", aliases: ["react native", "react-native"] },
  { id: "flutter", label: "Flutter", category: "mobile", aliases: ["flutter"] },
  { id: "android", label: "Android", category: "mobile", aliases: ["android"] },
  { id: "ios", label: "iOS", category: "mobile", aliases: ["ios", "swiftui", "uikit"] },

  // Databases
  { id: "sql", label: "SQL", category: "database", aliases: ["sql"] },
  { id: "postgresql", label: "PostgreSQL", category: "database", aliases: ["postgresql", "postgres", "psql"] },
  { id: "mysql", label: "MySQL", category: "database", aliases: ["mysql", "mariadb"] },
  { id: "mongodb", label: "MongoDB", category: "database", aliases: ["mongodb", "mongo"] },
  { id: "redis", label: "Redis", category: "database", aliases: ["redis"] },
  { id: "elasticsearch", label: "Elasticsearch", category: "database", aliases: ["elasticsearch", "opensearch"] },
  { id: "dynamodb", label: "DynamoDB", category: "database", aliases: ["dynamodb"] },
  { id: "cassandra", label: "Cassandra", category: "database", aliases: ["cassandra"] },
  { id: "prisma", label: "Prisma", category: "database", aliases: ["prisma"] },

  // Cloud
  { id: "aws", label: "AWS", category: "cloud", aliases: ["aws", "amazon web services", "ec2", "lambda", "s3"] },
  { id: "gcp", label: "Google Cloud", category: "cloud", aliases: ["gcp", "google cloud", "google cloud platform"] },
  { id: "azure", label: "Azure", category: "cloud", aliases: ["azure", "microsoft azure"] },
  { id: "vercel", label: "Vercel", category: "cloud", aliases: ["vercel"] },
  { id: "supabase", label: "Supabase", category: "cloud", aliases: ["supabase"] },
  { id: "firebase", label: "Firebase", category: "cloud", aliases: ["firebase"] },

  // DevOps
  { id: "docker", label: "Docker", category: "devops", aliases: ["docker", "containerization"] },
  { id: "kubernetes", label: "Kubernetes", category: "devops", aliases: ["kubernetes", "k8s", "eks", "gke"] },
  { id: "terraform", label: "Terraform", category: "devops", aliases: ["terraform"] },
  { id: "cicd", label: "CI/CD", category: "devops", aliases: ["ci/cd", "cicd", "continuous integration", "continuous delivery"] },
  { id: "github-actions", label: "GitHub Actions", category: "devops", aliases: ["github actions", "gitlab ci", "circleci", "jenkins"] },
  { id: "linux", label: "Linux", category: "devops", aliases: ["linux", "unix", "ubuntu"] },
  { id: "observability", label: "Observability", category: "devops", aliases: ["observability", "prometheus", "grafana", "datadog"] },

  // Data & AI
  { id: "machine-learning", label: "Machine Learning", category: "data", aliases: ["machine learning", "ml", "deep learning"] },
  { id: "llm", label: "LLMs", category: "data", aliases: ["llm", "llms", "large language model", "large language models", "generative ai", "genai"] },
  { id: "nlp", label: "NLP", category: "data", aliases: ["nlp", "natural language processing"] },
  { id: "pytorch", label: "PyTorch", category: "data", aliases: ["pytorch"] },
  { id: "tensorflow", label: "TensorFlow", category: "data", aliases: ["tensorflow", "keras"] },
  { id: "pandas", label: "pandas", category: "data", aliases: ["pandas", "numpy"] },
  { id: "spark", label: "Spark", category: "data", aliases: ["spark", "pyspark", "databricks"] },
  { id: "kafka", label: "Kafka", category: "data", aliases: ["kafka"] },
  { id: "airflow", label: "Airflow", category: "data", aliases: ["airflow", "dagster", "prefect"] },
  { id: "snowflake", label: "Snowflake", category: "data", aliases: ["snowflake", "bigquery", "redshift"] },
  { id: "dbt", label: "dbt", category: "data", aliases: ["dbt"] },
  { id: "etl", label: "ETL", category: "data", aliases: ["etl", "elt", "data pipeline", "data pipelines"] },
  { id: "tableau", label: "Tableau", category: "data", aliases: ["tableau", "power bi", "looker"] },

  // Tools & platforms
  { id: "git", label: "Git", category: "tool", aliases: ["git", "github", "gitlab"] },
  { id: "salesforce", label: "Salesforce", category: "tool", aliases: ["salesforce", "apex", "sfdc"] },
  { id: "sap", label: "SAP", category: "tool", aliases: ["sap", "abap"] },
  { id: "selenium", label: "Selenium", category: "tool", aliases: ["selenium"] },
  { id: "cypress", label: "Cypress", category: "tool", aliases: ["cypress", "playwright"] },
  { id: "jest", label: "Jest", category: "tool", aliases: ["jest", "vitest", "pytest", "junit"] },
  { id: "jira", label: "Jira", category: "tool", aliases: ["jira", "confluence"] },
  { id: "figma", label: "Figma", category: "tool", aliases: ["figma"] },
  { id: "agile", label: "Agile", category: "tool", aliases: ["agile", "scrum", "kanban"] },
];

export const SKILL_BY_ID = new Map(SKILLS.map((skill) => [skill.id, skill]));

export function skillLabel(id: string) {
  return SKILL_BY_ID.get(id)?.label ?? id;
}

/** Longest alias first so "react native" wins over "react". */
export const ALIAS_ENTRIES = SKILLS.flatMap((skill) =>
  skill.aliases.map((alias) => ({ alias: alias.toLowerCase(), skill })),
).sort((a, b) => b.alias.split(" ").length - a.alias.split(" ").length);

export const MAX_ALIAS_WORDS = ALIAS_ENTRIES.reduce(
  (max, entry) => Math.max(max, entry.alias.split(" ").length),
  1,
);

export type RoleFamily =
  | "frontend"
  | "backend"
  | "fullstack"
  | "mobile"
  | "data"
  | "ml"
  | "devops"
  | "qa"
  | "security"
  | "product"
  | "design"
  | "other";

export const ROLE_LABELS: Record<RoleFamily, string> = {
  frontend: "Frontend Engineering",
  backend: "Backend Engineering",
  fullstack: "Full Stack Engineering",
  mobile: "Mobile Engineering",
  data: "Data Engineering",
  ml: "Machine Learning",
  devops: "DevOps / Infrastructure",
  qa: "QA / Test Automation",
  security: "Security",
  product: "Product",
  design: "Design",
  other: "Other",
};

/** Checked in order; the first match wins, so compounds precede their parts. */
export const ROLE_PATTERNS: { family: RoleFamily; patterns: RegExp[] }[] = [
  { family: "qa", patterns: [/\bqa\b/, /quality (assurance|engineer)/, /\bsdet\b/, /test automation/, /software tester/, /\btester\b/] },
  { family: "devops", patterns: [/devops/, /\bsre\b/, /site reliability/, /infrastructure engineer/, /platform engineer/, /cloud engineer/, /systems engineer/] },
  { family: "ml", patterns: [/machine learning/, /\bml\b/, /\bai\b engineer/, /deep learning/, /research scientist/, /applied scientist/, /\bnlp\b/] },
  { family: "data", patterns: [/data engineer/, /data scientist/, /data analyst/, /analytics engineer/, /database administrat/, /\bdataops\b/, /data quality/] },
  { family: "mobile", patterns: [/mobile/, /android/, /\bios\b/, /react native/, /flutter/] },
  { family: "fullstack", patterns: [/full[\s-]?stack/, /fullstack/] },
  { family: "frontend", patterns: [/front[\s-]?end/, /frontend/, /\bui engineer/, /web developer/] },
  { family: "backend", patterns: [/back[\s-]?end/, /backend/, /server[\s-]?side/, /\bapi engineer/, /distributed systems/] },
  { family: "security", patterns: [/security/, /\bappsec\b/, /penetration test/] },
  { family: "design", patterns: [/\bdesigner\b/, /\bux\b/, /\bui\/ux\b/] },
  { family: "product", patterns: [/product manager/, /product owner/] },
];

export type SeniorityLevel = "intern" | "junior" | "mid" | "senior" | "staff" | "principal";

export const SENIORITY_LABELS: Record<SeniorityLevel, string> = {
  intern: "Intern",
  junior: "Junior",
  mid: "Mid-level",
  senior: "Senior",
  staff: "Staff",
  principal: "Principal",
};

export const SENIORITY_RANK: Record<SeniorityLevel, number> = {
  intern: 0,
  junior: 1,
  mid: 2,
  senior: 3,
  staff: 4,
  principal: 5,
};

export const SENIORITY_PATTERNS: { level: SeniorityLevel; patterns: RegExp[] }[] = [
  { level: "intern", patterns: [/\bintern\b/, /internship/, /\btrainee\b/, /\bapprentice\b/] },
  { level: "principal", patterns: [/\bprincipal\b/, /\bdistinguished\b/, /\barchitect\b/, /\bdirector\b/, /\bhead of\b/, /\bvp\b/] },
  { level: "staff", patterns: [/\bstaff\b/, /\blead\b/, /\bmanager\b/, /\bsde\s*(iii|3)\b/] },
  { level: "senior", patterns: [/\bsenior\b/, /\bsr\.?\b/, /\bsde\s*(ii|2)\b/] },
  { level: "junior", patterns: [/\bjunior\b/, /\bjr\.?\b/, /\bentry[\s-]?level\b/, /\bgraduate\b/, /\bsde\s*(i|1)\b/, /\bassociate\b/] },
];
