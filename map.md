Product Description — V1

1. Product Overview

Working concept

A personalized job discovery and startup opportunity platform that helps candidates find jobs and early-stage startups they are genuinely well suited for, rather than forcing them to search through thousands of generic listings.

The user uploads their resume once. The platform analyzes their experience, skills, projects, seniority, preferences, and career direction. It then continuously collects relevant jobs and startup/company information from public sources, matches those opportunities against the candidate profile, and explains why each opportunity is worth pursuing and how the candidate should approach it.

Core product promise

Don't search through thousands of jobs. Find the opportunities you should actually pursue.

The platform combines:

Resume intelligence

Job aggregation

Startup discovery

Candidate-to-opportunity matching

Resume optimization

Company intelligence

Application strategy

The key differentiator is that the platform should not simply answer:

"What jobs exist?"

It should answer:

"Which opportunities are worth your time, why are you a fit, and what should you do to maximize your chances of getting hired?"

2. Problem

Current job platforms create several problems:

Too many opportunities

Candidates can find hundreds or thousands of potentially relevant jobs, but most are poor fits.

Generic recommendations

Most job boards primarily match based on keywords. They do not deeply understand the candidate's actual experience, projects, strengths, gaps, or career trajectory.

Startup opportunities are fragmented

Early-stage startups often have:

No large careers page

Few formal job postings

Hiring announcements in different places

Public GitHub activity

Founder posts

Small engineering teams

Informal hiring processes

A strong candidate may never discover these opportunities.

Candidates don't know how to approach companies

Even after finding a good company, candidates often don't know:

Whether to apply or contact the founder

Who they should contact

What part of their resume to emphasize

What skills they are missing

Whether contributing to an open-source repository would help

How to demonstrate interest in the company

Whether the company is worth prioritizing

Resume tailoring is painful

Candidates repeatedly rewrite their resume for different jobs without knowing what changes will meaningfully improve their fit.

3. Product Vision

The vision is to become a personal career opportunity agent.

Instead of acting like a traditional job board, the product continuously works on behalf of the candidate:

Understand the candidate.

Discover relevant companies and jobs.

Rank opportunities based on actual fit.

Explain the reasoning.

Recommend how to approach each opportunity.

Help tailor the candidate's resume.

Eventually help manage the entire application pipeline.

V1 should establish the foundation for this vision without attempting to automate the entire job search.

4. Target User

Primary user

Early-career and mid-level software engineers looking for:

Full-time jobs

Remote jobs

Startup opportunities

Engineering roles

High-growth companies

YC-backed companies

Companies where direct outreach can outperform traditional applications

Example user

A software engineer with:

1–3 years of experience

React / React Native experience

Node.js backend experience

PostgreSQL experience

Several GitHub projects

Interest in startups

Willingness to work remotely

Instead of receiving every React/Node job on the internet, the platform should identify:

"These 15 opportunities are unusually relevant to you."

5.Product Scope

Candidate onboarding

Job discovery and aggregation

Startup discovery

Opportunity matching and ranking

Opportunity intelligence

Resume and application guidance

6. User Flow

Step 1 — Landing page

The landing page communicates the core value proposition.

Example:

Find the companies you should actually work for.

Supporting text:

Upload your resume and get personalized jobs, startups, application strategies, and resume recommendations based on your actual experience.

Primary CTA:

Upload Resume

Secondary CTA:

Explore Example Opportunities

7. Authentication

V1 should support:

Email/password authentication

Google OAuth

The user account stores their candidate profile, resume versions, preferences, saved opportunities, and application activity.

8. Resume Upload

The user uploads:

PDF

DOCX

Optional future support:

TXT

LinkedIn profile import

After upload, the system extracts structured information.

Extracted candidate information

Basic information

Name

Email

Location

LinkedIn

GitHub

Portfolio

Other public links

Professional information

Current role

Previous roles

Years of experience

Companies

Employment dates

Education

Skills

Categorized into:

Frontend

Backend

Mobile

Databases

Cloud

DevOps

Languages

Frameworks

Tools

Other technical skills

Projects

For every project:

Name

Description

Technologies

Responsibilities

Impact

Links

GitHub repository

Career signals

The AI should infer:

Seniority

Primary specialization

Secondary skills

Industry interests

Startup suitability

Likely role types

Strengths

Skill gaps

The system should distinguish between explicit facts and AI-inferred attributes.

9. Candidate Profile

After processing the resume, the platform creates a structured candidate profile.

Example:

Candidate
├── Experience
│   ├── Full Stack Developer
│   └── React Native Developer
│
├── Primary Skills
│   ├── React
│   ├── React Native
│   ├── TypeScript
│   └── Node.js
│
├── Secondary Skills
│   ├── PostgreSQL
│   ├── Next.js
│   ├── Hono
│   └── Prisma
│
├── Experience Level
│   └── Junior / Early Mid-Level
│
├── Preferred Roles
│   ├── Full Stack Engineer
│   ├── Frontend Engineer
│   └── React Native Engineer
│
└── Candidate Strengths
    ├── Cross-platform development
    ├── Full-stack ownership
    └── Startup experience

The user must be able to edit this profile.

10. Job Discovery

The platform collects job opportunities from multiple public sources.

Potential sources for V1:

Company career pages

Public job boards

Startup job boards

YC-related job listings

Other legally accessible public sources

The exact source list should be determined based on technical feasibility, terms of service, reliability, and data quality.

Job ingestion pipeline

Source
   ↓
Crawler / Scraper
   ↓
Raw Job
   ↓
Normalizer
   ↓
Deduplication
   ↓
Validation
   ↓
Job Database
   ↓
Matching Engine

11. Job Data Model

Each normalized job should contain, where available:

Job ID

Source

Source URL

Application URL

Company

Company ID

Job title

Description

Location

Remote status

Employment type

Salary

Seniority

Required skills

Preferred skills

Technology stack

Posted date

Last seen date

Expiration status

Company size

Industry

The system should preserve the original source URL so users can always reach the original opportunity.

12. Job Deduplication

The same job may appear across multiple sources.

V1 should attempt to merge duplicates using signals such as:

Company

Job title

Location

Application URL

Description similarity

External job IDs

The user should ideally see one opportunity rather than five copies.

13. Startup Discovery

This is a major differentiator of the product.

The platform should maintain a startup/company intelligence dataset.

Initial focus:

YC startups + high-quality early-stage technology companies

For each startup, collect publicly available information where possible.

Startup information

Company name

Website

YC batch

YC profile

Description

Industry

Founders

Team size

Location

Funding information where reliably available

Careers page

Open positions

GitHub organization

Public repositories

Technology signals

Recent activity

Hiring signals

14. GitHub Intelligence

If a startup has a public GitHub organization or repository, display it.

Possible information:

GitHub organization

Repository links

Languages

Repository activity

Stars

Contributors

Recent commits

Open issues

Open-source projects

The purpose is not simply to show a GitHub link.

The system should use public repository information as a company-interest signal.

Example:

This startup has an active TypeScript/React repository and your profile contains strong TypeScript and React experience.

Potential future feature:

Contribute to this repo

The V1 version should primarily provide the repository and explain why it may be relevant.

15. Startup Opportunity Without a Job Posting

One of the most important V1 concepts is that a company does not necessarily need to have an active job posting.

Example:

Startup:
AI infrastructure company

Public signals:
- YC-backed
- 18 employees
- Active engineering GitHub
- Recently launched product
- Founder actively hiring
- No formal engineering job posting

Candidate:
Backend engineer with Python + PostgreSQL

Result:
High-potential startup opportunity

The platform can recommend:

This company may be worth approaching directly even though there is no matching public job listing.

This creates a category that traditional job boards generally don't provide.

16. Opportunity Types

V1 should support at least two opportunity types.

Type A — Job Opportunity

A company has an explicit role.

Example:

Senior Frontend Engineer — Company X

Type B — Startup Opportunity

There is no directly matching job, but the company appears to be a strong candidate for direct outreach.

Example:

Company Y — Strong startup match; no public frontend opening detected.

This distinction should be visible in the UI.

17. Matching Engine

The matching engine is the heart of the product.

A simple keyword search is not sufficient.

The system should compare:

Candidate

Skills

Experience

Seniority

Projects

Industry

Location

Role preference

Technology experience

Opportunity

Required skills

Preferred skills

Job responsibilities

Seniority

Technology stack

Company stage

Industry

Location

Hiring signals

18. Match Score

Each opportunity receives a score.

Example:

91% Match

The score should be explainable.

Example:

Overall Match: 91%

Skills:             96%
Experience:         88%
Role Alignment:     94%
Seniority:          90%
Technology:         93%
Location:           100%

The exact scoring algorithm can evolve.

V1 should prioritize useful explanations over pretending the score is scientifically precise.

19. Match Explanation

Every recommendation should answer:

Why are you a good fit?

Example:

Your React, TypeScript, and PostgreSQL experience closely matches the company's stack. Your previous startup experience also aligns with the team's environment.

What are you missing?

Example:

The role prefers experience with GraphQL and AWS. Neither appears prominently in your resume.

How serious is the gap?

Classify gaps as:

Minor

Moderate

Significant

This prevents users from automatically rejecting opportunities because they don't meet every requirement.

20. Opportunity Detail Page

Every job/startup should have a dedicated detail page.

Header

Company

Role / Opportunity type

Match score

Location

Remote status

Apply button

Sections

Why this matches you

AI-generated explanation.

Your strengths

Relevant candidate experience.

Skill gaps

What the candidate is missing.

Company

What they do

Stage

YC information

Team information

Relevant links

GitHub

If publicly available:

Organization

Relevant repositories

Technology signals

How to approach

Personalized action plan.

Resume recommendations

Specific changes.

External links

Apply

Company website

YC profile

GitHub

Careers

LinkedIn/company social profiles when publicly available

21. Resume Recommendations

This is one of the core product features.

For every high-value opportunity, the platform should identify which parts of the resume should change.

Example:

Current resume

Built a mobile application using React Native.

Recommendation

The target company heavily values full-stack ownership.

Suggested rewrite:

Built and shipped a cross-platform React Native application and integrated backend APIs and PostgreSQL data workflows.

The platform should not fabricate achievements.

Recommendations must be based on information already present in the candidate's resume/profile.

22. Resume Fit Analysis

The system should provide:

Keep

Resume sections that are highly relevant.

Emphasize

Experience that should be moved higher or highlighted.

Improve

Weak or vague bullets.

De-emphasize

Experience that is less relevant to the target opportunity.

Missing

Important skills or keywords that the candidate genuinely possesses but has not clearly represented.

Important rule:

Never recommend adding a skill merely because the job description asks for it if the candidate has not demonstrated that skill.

23. Application Strategy

For each high-quality opportunity, provide a practical strategy.

Example:

Recommended approach

1. Apply directly

Use the official application page.

2. Find the right person

Potential targets:

Founder

CTO

Engineering manager

Hiring manager

Only use publicly available professional information.

3. Personalize outreach

Reference:

Relevant product

Relevant technical area

Candidate's relevant experience

4. Demonstrate interest

If there is a relevant public GitHub repository, the platform can suggest exploring it.

The product should not encourage spam or mass automated outreach.

24. Startup Join Guide

For startup opportunities, the platform should provide:

Why this startup

Why the company appears relevant to the candidate.

What they are building

Simple explanation of the company.

Why you could be valuable

Connect candidate skills to likely startup needs.

What to learn

Relevant skill gaps.

What to build

Potential small project or contribution that could demonstrate capability.

Who to contact

Publicly identifiable founder/engineering contacts where appropriate.

Recommended approach

A concise sequence of actions.

Example:

1. Read the product documentation.
2. Explore the public GitHub repository.
3. Identify the most relevant engineering problem.
4. Prepare a small demonstration or contribution.
5. Contact the founder/engineering lead.
6. Apply if an official role exists.

25. Dashboard

The dashboard is the user's primary workspace.

Top-level sections

Recommended Jobs

Startups

Saved

Applications

Resume

Profile

Dashboard summary

Example:

Your Job Hunt

12
High-fit jobs

7
Startup opportunities

4
Resume improvements

3
New opportunities this week

26. Recommended Feed

The main feed should prioritize quality over quantity.

Instead of showing 100 jobs immediately, show a ranked list such as:

1. Acme AI
   Full Stack Engineer
   94% Match
   Strong React + Node.js overlap

2. XYZ Labs
   React Native Engineer
   92% Match
   Your mobile experience is highly relevant

3. Startup ABC
   Startup Opportunity
   89% Match
   No public opening, but strong technical overlap

27. Filters

Users should be able to filter recommendations by:

Role

Location

Remote

Experience level

Salary where available

Company stage

YC

Industry

Technology

Job type

Startup-specific filters:

YC batch

Team size

Funding stage

Technology

Location

Hiring signal

28. Search

Users should be able to search across:

Jobs

Companies

Startups

Example searches:

React Native startups

Remote TypeScript jobs

YC AI startups hiring engineers

Early-stage startups using Rust

Search should work on the normalized internal dataset rather than performing an expensive live scrape for every query.

29. Saved Opportunities

Users can save:

Jobs

Companies

Startups

Saved items should preserve:

Match score at save time

Current status

Application link

Notes

30. Application Tracking

V1 can exclude this or this should remain lightweight in V1.

31. Opportunity Freshness

Job data becomes stale quickly.

Each opportunity should display freshness where possible:

Posted recently

Updated recently

Verified recently

Possibly expired

The ingestion system should periodically verify active listings.

If a job disappears from the source, the system should eventually mark it as expired rather than presenting it as active indefinitely.

32. Notifications

V1 can support basic notifications.

Examples:

3 new high-fit jobs were found for you.

A startup matching your profile was recently discovered.

Your saved job may no longer be active.

A company you saved has a new engineering opening.

Email notifications are sufficient for V1.

Push notifications can come later.

33. AI Architecture

AI should be used where reasoning adds value.

AI responsibilities

Resume parsing

Candidate profile extraction

Skill normalization

Job description understanding

Company description summarization

Candidate-job matching

Match explanation

Skill gap analysis

Resume recommendations

Application strategy

Startup opportunity reasoning

Deterministic/backend responsibilities

Crawling

Data extraction

Deduplication

Validation

URL management

Job freshness

Authentication

Database operations

Search

Filtering

34. Data Pipeline

Public Sources
      ↓
Collectors / Scrapers
      ↓
Raw Data
      ↓
Normalization
      ↓
Entity Resolution
      ↓
Deduplication
      ↓
Validation
      ↓
Company + Job Database
      ↓
Candidate Matching
      ↓
AI Analysis
      ↓
Personalized Feed

35. Core Database Entities

V1 will likely need entities such as:

User
CandidateProfile
Resume
ResumeVersion
Skill
CandidateSkill
Experience
Project

Company
Startup
CompanyTechnology
CompanyRepository

Job
JobSkill
JobSource

Opportunity
Match
MatchReason

SavedOpportunity
Application
ApplicationNote

Notification

Exact schema can evolve during implementation.

36. Company Entity

A company should be treated as a first-class entity rather than duplicated inside every job.

Example:

Company
├── Name
├── Website
├── Description
├── Industry
├── Stage
├── Team Size
├── YC Batch
├── Founders
├── Careers URL
├── GitHub
└── Jobs

This enables the platform to connect multiple jobs and startup opportunities to one company.

37. Job Entity

Job
├── Company
├── Title
├── Description
├── Location
├── Remote
├── Salary
├── Seniority
├── Skills
├── Source
├── Application URL
├── Posted Date
└── Last Verified

38. Startup Entity

Startup
├── Company
├── YC Batch
├── Description
├── Founders
├── Website
├── Team Size
├── Funding
├── GitHub
├── Careers
├── Technology
└── Hiring Signals

39. Opportunity Entity

An opportunity abstracts both jobs and startup recommendations.

Opportunity
├── Type
│   ├── JOB
│   └── STARTUP
│
├── Company
├── Job
├── Candidate
├── Match Score
├── Match Reasons
├── Skill Gaps
├── Resume Recommendations
└── Application Strategy

This allows the frontend to present jobs and startup opportunities through a common recommendation system.

40. V1 Ranking Strategy

A practical initial ranking formula could combine:

Overall Score =
    Skill Match
  + Experience Match
  + Role Match
  + Seniority Match
  + Location Match
  + Technology Match
  + Candidate Preference Match
  + Company Opportunity Signal

Each factor should have a configurable weight.

Do not over-engineer the initial ranking system.

Start with a transparent weighted model and improve it using user behavior.

41. Feedback Loop

The platform should learn from user behavior.

Useful signals:

Opportunity viewed

Saved

Applied

Rejected

Hidden

Application progressed

Interview received

User manually changed preferences

Example:

If a candidate repeatedly saves React Native startup opportunities but ignores generic frontend jobs, the recommendation system should gradually increase the importance of React Native/startup signals.

42. V1 Analytics

Track product-level metrics such as:

Acquisition

Signups

Resume uploads

Onboarding completion

Engagement

Opportunities viewed

Opportunities saved

Search usage

Resume recommendations viewed

Conversion

Applications started

Applications marked as submitted

Interviews reported

Offers reported

Recommendation quality

Save rate

Apply rate

Hide rate

Interview rate

The most important metric is not raw job views.

A stronger north-star metric is:

High-quality opportunities acted upon per active candidate.

43. What V1 Does NOT Need

To keep scope controlled, V1 should not include:

Fully automated job applications

Automated cold-email sending

Browser agents applying to jobs

Complex interview preparation

AI interview simulation

Payroll/recruiting infrastructure

Recruiter marketplace

Paid recruiter tools

Massive social network

Full ATS replacement

Automated GitHub contributions

These can become future products/features.

44. Legal / Data Principles

The product depends heavily on public web data.

V1 should prioritize:

Publicly accessible information

Respecting source terms and applicable restrictions

Rate limiting

Source attribution

Original application links

Data freshness

User privacy

The platform should not pretend to have private company information.

Company and founder information should be sourced from legitimate public sources.

45. Trust Principles

The product's recommendations need to feel credible.

Never fabricate

Do not invent:

Job requirements

Company information

Founder information

GitHub repositories

Funding

Candidate experience

Skills

Separate facts from inference

Example:

Fact: Company has a public TypeScript repository.

Inference: Your TypeScript experience may make this company a strong technical fit.

This distinction is important for user trust.

46. V1 Monetization

Potential freemium model.

Free

Resume upload

Basic candidate profile

Limited job recommendations

Limited startup recommendations

Basic matching

Pro

Potential features:

Unlimited personalized recommendations

Advanced startup discovery

Detailed startup join guides

Resume tailoring

Deep company intelligence

More frequent opportunity refreshes

Application tracking

Notifications

Advanced filters

The exact pricing should be validated after initial usage.

47. V1 Technical Architecture

A reasonable architecture:

                 Web App
                    │
                    ▼
              API / Backend
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
   PostgreSQL     Search       AI Layer
       │                         │
       ▼                         ▼
 Company/Job DB            LLM Services
       ▲
       │
 Scraping Workers
       │
       ├── Job Sources
       ├── Company Sites
       ├── YC Data
       └── GitHub/Public Sources

Potential implementation:

Frontend

Next.js

React

TypeScript

Tailwind CSS

shadcn/ui

Backend

Next.js API routes or dedicated Node/NestJS/Hono backend

TypeScript

Database

PostgreSQL

Prisma or Drizzle

Background processing

Queue-based workers

Scheduled scraping

Job normalization

Deduplication

Search

Initially PostgreSQL full-text search can be sufficient.

A dedicated search engine can be introduced later if scale requires it.

AI

LLM provider abstraction so models can be changed without rewriting the application.

48. V1 Pages

Public

Landing

Login

Signup

Pricing

Privacy

Terms

Authenticated

Onboarding

Resume upload

Candidate profile review

Preferences

Dashboard

Recommended opportunities

Activity

New matches

Jobs

Job feed

Search

Filters

Job detail

Startups

Startup feed

Search

Filters

Startup detail

Opportunity detail

Match

Why fit

Skill gaps

Resume recommendations

Company intelligence

Join/application strategy

Resume

Current resume

Parsed profile

Resume versions

Recommendations

Applications

Application tracker

Settings

Profile

Preferences

Notifications

Account

49. V1 MVP Success Criteria

V1 is successful if a new user can:

Create an account.

Upload their resume.

Review and correct their candidate profile.

Receive personalized job recommendations.

Receive personalized startup recommendations.

Understand why each recommendation matches them.

See relevant company information.

See public GitHub/repository information where available.

Get concrete resume recommendations.

Get a practical application/startup outreach strategy.

Save opportunities.

Track applications.

Receive notifications for new high-fit opportunities.

50. The Core Experience

The ideal first session should feel like this:

Upload Resume
      ↓
"Analyzing your experience..."
      ↓
Candidate Profile
      ↓
"Found 47 potentially relevant opportunities."
      ↓
"Here are the 12 worth your attention."
      ↓
Top Opportunities
      ↓
Open Opportunity
      ↓
"You're a 91% match."
      ↓
"Here's why."
      ↓
"Here's what you're missing."
      ↓
"Here's what I'd change in your resume."
      ↓
"Here's how I'd approach this company."
      ↓
Apply / Save / Track

That is the product's core loop.

51. One-Sentence Definition

A personalized career intelligence platform that analyzes your resume, discovers high-fit jobs and startups, and tells you exactly why you should pursue them and how to get in.


