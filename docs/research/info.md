The reason why we are building this project is for the scholarship program in the UK we are applying for, and one of the mentors is going to be interested in this type of tech.

https://www.pivotal-research.org/mentors#samira-jasper

Projects
Research Direction: AIxBio Evaluations

Agentic bio evaluations

Intersection of LLMs and bio AI models

In-depth statistics and IRT of bio evaluations

What I'm looking for in a Mentee
We're looking for somebody with strong technical abilities who's able to prototype and iterate quickly, has some amount of experience in prioritizing research tasks, and communicates well. Context on biosecurity and the AIxBio intersection is a plus.

What I'm Like as a Mentor
The exact structure of mentorship at SecureBio can vary quite a bit depending on the project you'd be working on—from mostly independent, hands-off project with self-directed research to more involved contribution to an existing project with multiple contributors.

Bio         
Samira has studied molecular biology and has extensive experience in software engineering and lab automation. She leads SecureBio's eval engineering efforts.

Jasper holds a PhD in clinical virology and has focused primarily on developing biology benchmarks since joining SecureBio's AI team in 2024.

## Quick Fit Assessment

This project is a strong fit if the application frames it as a research prototype, not a production bio tool:

- The mentor page explicitly points to AIxBio evaluations, agentic bio evaluations, and in-depth statistics / IRT work.
- A multi-model evaluation harness is aligned with eval engineering, especially if it measures cross-model uplift, refusal behavior, and consistency.
- The best signal is not "we built a complex stack"; it is "we built a careful evaluation scaffold with proxy tasks, controls, and calibration."

## Market Positioning

What seems most compelling for the scholarship:

- A narrow research question with measurable outputs
- A local-first MVP that can be demoed quickly
- Clear controls: solo baseline, random routing baseline, and human calibration subset
- A clean path from prototype to publishable analysis or a follow-on benchmark

What to avoid:

- Over-architecting the system before there are results
- Claiming the tool is a finished safety benchmark
- Using sensitive task content in the public repo

## Recommended Narrative

Position the project as:

"An MVP research harness for studying whether multi-model orchestration can increase capability or unsafe uplift on bio-relevant proxy tasks, with controls and calibration so the results are interpretable."
