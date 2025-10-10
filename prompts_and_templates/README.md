# TomitaLaw Office - Prompts and Templates Library

This directory contains all prompts and templates used for immigration automation at TomitaLaw Office. All templates follow an instruction-based approach with concrete examples for consistent letter generation.

## Directory Structure

```
prompts_and_templates/
├── main_prompts/          # Core AI agent prompts
├── form_prompts/          # Form automation prompts
├── letter_templates/      # Immigration letter templates
└── README.md             # This documentation
```

## Main Prompts

### letter_agent_prompt.md
**Purpose:** Master prompt for immigration letter drafting assistant
**Features:**
- Template selection and data extraction workflow
- Timeline logic verification (mandatory)
- Information gathering and conflict resolution protocols
- Canvas-based letter generation
- Quality standards and red flags checklist

## Form Prompts

### visa_scheduler_prompt_v1.txt
**Purpose:** ChatGPT prompt for visa appointment scheduling form automation
**Features:**
- Main applicant vs dependent logic
- Document delivery address rules
- Multi-site scheduling support

### ds160_retrieval_prompt_v1.txt
**Purpose:** ChatGPT prompt for DS-160 Retrieval Helper credential extraction
**Features:**
- 30-day DS-160 expiration tracking support
- Batch extraction for multiple applicants
- Family application handling (principal + dependents)
- Field validation (10-char application ID, uppercase formatting)

### ds160_prompt_combined_v5.txt
**Purpose:** ChatGPT prompt for DS-160 visa application form automation
**Features:**
- Hybrid v4 array structures + v5 smart inference
- JSON optimization rules to prevent API cutoffs
- Multi-visa type support (L-1, E-2, H-1B)
- Field-specific inference guidance

## Letter Templates

### L1A Blanket Manager Templates
- **l1a_blanket_manager_renewal_template.md** - For continuing L1A managers
- **l1a_blanket_manager_application_template.md** - For initial L1A manager transfers

**Key Features:**
- Executive capacity legal justification
- "Continue assuming" vs "will assume" language
- Comprehensive managerial duties
- 3-tier company structure support

### L1B Blanket Specialized Knowledge Templates
- **l1b_renewal_letter_template.md** - For continuing L1B specialists
- **l1b_blanket_application_template.md** - For initial L1B transfers

**Key Features:**
- Specialized knowledge justification paragraph
- Technical training and knowledge transfer duties
- "Continue to assume" vs "will replace" language
- 5 detailed job duties with percentages

### E2 Treaty Investor Templates
- **e2_manager_template.md** - For E2 managerial positions
- **e2_executive_template.md** - For senior E2 executive positions
- **e2_essential_skills_template.md** - For E2 specialized expertise roles
- **e2_corporate_registration_private_company_template.md** - Private company registrations
- **e2_corporate_registration_public_company_template.md** - Public company registrations

**Key Features:**
- 9 FAM 402.9 legal compliance
- Treaty relationship establishment
- Investment amount and business plan details
- Public vs private company nationality requirements

### H1B Specialty Occupation Template
- **h1b_template.md** - For H1B specialty occupation petitions

**Key Features:**
- USCIS-specific formatting and legal analysis
- Occupational Outlook Handbook (OOH) references
- SOC code specifications
- Innova Solutions case law compliance

## Template Usage Guidelines

### Instruction-Based Approach
All templates use instruction-based format instead of placeholder-based format:
- ✅ "Include beneficiary name and position"
- ❌ "[BENEFICIARY_NAME]" and "[POSITION_TITLE]"

### Timeline Logic (Critical)
All templates enforce mandatory timeline verification:
- Past roles: past tense with end dates
- Current role: present tense
- No employment overlaps between countries
- Foreign employment must end before U.S. employment starts

### Template Selection Logic
- **Renewal vs Initial:** Use appropriate language ("continue" vs "will assume")
- **Visa Classification:** Match template to specific visa type requirements
- **Company Structure:** Select based on parent-subsidiary relationships
- **Position Level:** Choose manager, executive, or specialized knowledge as appropriate

## Quality Standards

### Required Elements (All Templates)
- [ ] Beneficiary name and title
- [ ] Company information and relationships
- [ ] Detailed job duties with percentages
- [ ] Qualification progression
- [ ] Legal compliance statements
- [ ] Proper signatory information

### Legal Compliance Features
- Position-specific regulatory requirements
- Proper visa classification justification
- Timeline consistency verification
- Company relationship documentation
- Qualification establishment

## Usage Workflow

1. **Template Selection:** Choose appropriate template based on visa type and application nature
2. **Data Extraction:** Use supporting documents to populate template instructions
3. **Timeline Verification:** Apply Section 2.7 timeline logic to all content
4. **Letter Generation:** Generate professional letter using canvas
5. **Quality Review:** Verify all required elements and legal compliance

## Version Control

- **Current Version:** All templates updated September 2025
- **Format:** Instruction-based with concrete examples
- **Compatibility:** Optimized for ChatGPT Letter Agent
- **Testing:** Verified for consistent letter generation quality

## Technical Notes

### Template Architecture
- Each template includes detailed instruction sections and complete example output
- Templates are designed to prevent ChatGPT from taking shortcuts or summarizing
- All templates emphasize legal accuracy and comprehensive detail

### Integration Points
- Templates integrate with `letter_agent_prompt.md` workflow
- Support document upload and data extraction processes
- Compatible with canvas-based letter generation system

---

**Last Updated:** September 26, 2025
**Maintained By:** TomitaLaw Office Immigration Team