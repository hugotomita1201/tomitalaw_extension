# Legal Advocacy Framework - Letter Templates PRD

**Document Version**: 1.0
**Date**: October 2025
**Author**: TomitaLaw AI Development
**Status**: Ready for Implementation

---

## Executive Summary

This PRD outlines the systematic application of the Legal Advocacy Framework to all immigration letter templates. The goal is to ensure ChatGPT understands its role as an attorney advocating for the strongest legally defensible position, not a stenographer transcribing company worksheets.

**Completed**: E2 Manager Template ✅
**Remaining**: 8 templates
**Approach**: Minimal, targeted changes (3 modifications per template)

---

## Problem Statement

### Current Issue
Letter templates can be misinterpreted as requiring verbatim transcription of company worksheets. This leads to:
- Under-described positions using vague HR language ("support," "help," "assist")
- Failure to demonstrate visa requirements (managerial capacity, specialized knowledge, etc.)
- Missed advocacy opportunities where applicant can credibly perform elevated duties

### Root Cause
Templates say "build from background" which can be read as "list past duties verbatim" rather than "advocate for strongest position applicant can credibly perform."

### Impact
- Weaker visa applications
- Increased RFE (Request for Evidence) risk
- Failure to leverage applicant's full qualifications

---

## Solution: Legal Advocacy Framework

### Core Philosophy
**Attorneys advocate. Stenographers transcribe. We are attorneys.**

Company worksheets describe positions in HR language unsuitable for immigration law. The attorney's job is to:
1. **Identify** what applicant can credibly perform based on documented background
2. **Elevate** worksheet language to demonstrate visa requirements
3. **Advocate** for the strongest legally defensible position

### The Four-Question Credibility Test
Before advocating for elevated duties, ask:
1. ✅ Can applicant CREDIBLY perform based on documented background?
2. ✅ Does description meet visa legal requirements?
3. ✅ Is there SUFFICIENT EVIDENCE in work history?
4. ✅ Will consular officer find it BELIEVABLE?

If YES to all four → Advocacy is appropriate.

---

## Implementation Pattern

### Standard Changes (Applied to E2 Manager - Reference Model)

**Change 1: Header Modification**
- **Location**: "Build Position from Background" section
- **OLD**: `BUILD POSITION FROM BENEFICIARY'S BACKGROUND`
- **NEW**: `ADVOCATE FOR STRONGEST POSITION FROM BENEFICIARY'S BACKGROUND`
- **Add**: "You are an attorney. Your job is to ADVOCATE for the strongest legally defensible position..."

**Change 2: Process Enhancement**
- **Location**: Process steps in position-building section
- **ADD**: Step about elevating worksheet language
- **Text**: "Transform 'support' → 'establish,' 'help' → 'direct,' 'assist' → 'oversee' to demonstrate [visa requirement]"

**Change 3: Section Rename**
- **Location**: Content guidelines section
- **OLD**: "Content Elimination Rules"
- **NEW**: "Content Elevation Rules - Legal Advocacy"
- **Philosophy**: Reframe from eliminating content to elevating operational language

---

## Template Inventory & Priority

### Completed
- ✅ **E2 Manager Template** (e2_manager_template.md) - Reference implementation

### High Priority (Managerial/Executive Positions)
1. **L1A Manager Application** (l1a_manager_application_template.md)
   - Similar to E2 Manager - requires managerial capacity demonstration
   - Targets: "BUILD POSITION" section, Process steps, Content rules

2. **E2 Executive Template** (e2_executive_template.md)
   - Executive capacity requires strategic elevation
   - Targets: Same pattern as E2 Manager

### Medium Priority (Specialized Knowledge/Skills)
3. **L1B Blanket Application** (l1b_blanket_application_template.md)
   - Specialized knowledge demonstration
   - Worksheet elevation: technical tasks → specialized expertise

4. **E2 Essential Skills** (e2_essential_skills_template.md)
   - Essential skills not readily available in US
   - Elevation: operational tasks → specialized functions

5. **E1 Treaty Trader** (e1_treaty_trader_template.md)
   - Trade management demonstration
   - Elevation: sales activities → strategic trade management

### Lower Priority (Dependent Applications)
6. **L2 Dependent** (l2_dependent_template.md)
   - Simpler application, less advocacy needed
   - May only need Change 1 (philosophy statement)

7. **E2 Dependent** (e2_dependent_template.md)
   - Similar to L2
   - Minimal changes required

### Exclude
- **E2 Manager V2** (e2_manager_template_v2.md) - This was a previous bloated attempt, ignore

---

## Detailed Implementation Guide

### Template 1: L1A Manager Application

**Target Sections to Modify:**

**Change 1**: Find section about "building position" or "position requirements"
- Search for: "position duties" or "position requirements" or "build position"
- Replace header with: `ADVOCATE FOR STRONGEST POSITION FROM BENEFICIARY'S BACKGROUND`
- Add attorney framing: "You are an attorney. Your job is to ADVOCATE..."

**Change 2**: Find "Process" or "Steps" section
- Add bullet: "Elevate worksheet language: Transform 'support' → 'establish,' 'help' → 'direct' to demonstrate managerial capacity"

**Change 3**: Find content guidelines section
- Likely titled: "Content Rules" or "What to Include/Exclude"
- Rename to: "Content Elevation Rules - Legal Advocacy"

### Template 2: E2 Executive Template

**Same pattern as Template 1**, but:
- Replace "managerial capacity" with "executive capacity"
- Emphasize strategic decision-making vs operational management

### Template 3: L1B Blanket Application

**Adaptation for Specialized Knowledge:**

**Change 1**: "ADVOCATE FOR STRONGEST SPECIALIZED KNOWLEDGE FROM BENEFICIARY'S BACKGROUND"
- Attorney framing: "Advocate for strongest demonstration of specialized knowledge"

**Change 2**: Process addition
- "Elevate worksheet language: Transform 'perform tasks' → 'apply specialized expertise,' 'handle duties' → 'leverage proprietary knowledge'"

**Change 3**: Content Elevation
- Focus on demonstrating knowledge NOT readily available in US labor market

### Template 4: E2 Essential Skills

**Adaptation for Essential Skills:**

**Change 1**: "ADVOCATE FOR STRONGEST ESSENTIAL SKILLS FROM BENEFICIARY'S BACKGROUND"

**Change 2**: Process addition
- "Elevate worksheet language to demonstrate skills essential to business and not readily available in US"

**Change 3**: Content Elevation
- Emphasize uniqueness and business necessity

### Template 5: E1 Treaty Trader

**Adaptation for Trade Management:**

**Change 1**: "ADVOCATE FOR STRONGEST TRADE MANAGEMENT POSITION"

**Change 2**: Process addition
- "Elevate worksheet language to demonstrate substantial trade management capacity"

**Change 3**: Content Elevation
- Focus on demonstrating trade volume, management authority, business development

### Templates 6-7: Dependent Applications (L2, E2)

**Minimal Changes:**
- May only need philosophy statement in opening
- These are simpler applications, less advocacy required
- Consider: "You are drafting as an attorney - present family relationship and financial support clearly and persuasively"

---

## Testing & Validation

### Success Criteria (Per Template)

**Before Implementation:**
- [ ] Identify all 3 target sections in template
- [ ] Verify current language can be misinterpreted as "transcribe verbatim"

**After Implementation:**
- [ ] "ADVOCATE" appears in position-building section header
- [ ] Attorney role is explicitly stated
- [ ] Worksheet elevation guidance is present with examples
- [ ] Content section renamed to "Elevation" not "Elimination"

### Quality Checks

**Philosophical Alignment:**
- Does template emphasize attorney advocacy role?
- Does it distinguish between advocacy (offered position) vs documentation (work history)?
- Does it include credibility test concept?

**Practical Guidance:**
- Are there concrete examples of worksheet → legal language transformation?
- Is the visa-specific requirement clearly stated?
- Does it explain WHEN to advocate vs when to document facts?

### Testing Methodology

**Test Case 1: Vague Worksheet**
- Input: Company worksheet with "support operations" language
- Expected: ChatGPT elevates to "establish operational frameworks and direct strategic initiatives"
- Validation: Output demonstrates visa requirement (managerial capacity, specialized knowledge, etc.)

**Test Case 2: Technical to Managerial**
- Input: Technical specialist with 15 years experience + managerial worksheet
- Expected: ChatGPT credibly advocates for managerial position based on documented supervisory scope
- Validation: Four-question credibility test passes

**Test Case 3: Transfer Case**
- Input: Previous letter + new applicant with different background
- Expected: Uses company descriptions but builds NEW position from NEW applicant's actual background
- Validation: Position duties match new applicant's demonstrated capabilities

---

## Implementation Schedule

### Phase 1: High Priority Templates (Week 1)
- L1A Manager Application
- E2 Executive Template

**Deliverables:**
- Both templates updated with 3 targeted changes
- Testing completed for both
- Documentation of any unique adaptations needed

### Phase 2: Medium Priority Templates (Week 2)
- L1B Blanket Application
- E2 Essential Skills
- E1 Treaty Trader

**Deliverables:**
- All templates updated
- Visa-specific adaptations documented
- Cross-template consistency verified

### Phase 3: Dependent Templates (Week 3)
- L2 Dependent
- E2 Dependent

**Deliverables:**
- Minimal changes applied
- All 8 templates complete
- Final quality audit

---

## Risk Assessment & Mitigation

### Risk 1: Template Bloat
**Concern**: Changes might add too much text, making templates unwieldy

**Mitigation**:
- Strict adherence to 3-change pattern
- No large new sections (unlike the failed V2 attempt)
- Targeted modifications only

### Risk 2: Inconsistent Application
**Concern**: Different visa types may need different advocacy approaches

**Mitigation**:
- Document visa-specific adaptations in this PRD
- E2 Manager serves as reference pattern
- Test each template with visa-specific scenarios

### Risk 3: Over-Advocacy
**Concern**: ChatGPT might fabricate qualifications

**Mitigation**:
- Four-question credibility test in all templates
- Emphasis on "legally defensible" not "legally imaginative"
- Clear distinction: elevate language, don't invent capabilities

---

## Success Metrics

### Quantitative Metrics
- **Template Coverage**: 8/8 remaining templates updated (100%)
- **Change Consistency**: All templates have 3 targeted changes minimum
- **Testing Pass Rate**: All test cases pass for all templates

### Qualitative Metrics
- **ChatGPT Understanding**: Does ChatGPT recognize its attorney advocacy role?
- **Output Quality**: Do generated letters demonstrate visa requirements effectively?
- **Credibility Maintenance**: Do elevated positions remain believable and evidence-based?

### Validation Method
**Before/After Comparison:**
1. Generate letter with OLD template using vague worksheet
2. Generate letter with NEW template using same worksheet
3. Compare: Does new version elevate language while maintaining credibility?

Expected improvement: New template produces legally sufficient language that demonstrates visa requirements while staying within bounds of applicant's documented capabilities.

---

## Appendix A: Transformation Examples by Visa Type

### E2/L1A Manager
- "Support training" → "Establish training frameworks and direct educational initiatives"
- "Help with planning" → "Develop strategic plans and execute implementation roadmaps"
- "Coordinate teams" → "Direct cross-functional operations and provide strategic leadership"

### L1B Specialized Knowledge
- "Perform technical tasks" → "Apply specialized proprietary expertise in [technology/process]"
- "Handle system maintenance" → "Leverage advanced knowledge of proprietary systems unavailable in US market"
- "Support product development" → "Contribute specialized technical expertise to product innovation"

### E2 Essential Skills
- "Manage production" → "Direct essential manufacturing processes requiring specialized training"
- "Quality control" → "Apply essential quality assurance expertise not readily available in US"
- "Equipment operation" → "Operate specialized equipment requiring essential skills unique to company"

### E1 Treaty Trader
- "Handle sales" → "Manage substantial trade between US and treaty country"
- "Customer relations" → "Develop and maintain trade relationships essential to treaty trade operations"
- "Order processing" → "Direct trade transaction processing and ensure compliance with treaty trade requirements"

---

## Appendix B: Reference - E2 Manager Changes

### Change 1: Line 131-133
**BEFORE:**
```markdown
**⚠️ CRITICAL: BUILD POSITION FROM BENEFICIARY'S BACKGROUND**

The position duties and requirements should be **derived from what THIS beneficiary has actually done**, not copied from what a previous beneficiary's position required.
```

**AFTER:**
```markdown
**⚠️ CRITICAL: ADVOCATE FOR STRONGEST POSITION FROM BENEFICIARY'S BACKGROUND**

You are an attorney. Your job is to ADVOCATE for the strongest legally defensible position based on what THIS beneficiary can credibly perform given their documented background. Company worksheets often use vague HR language - elevate this into professional legal language demonstrating managerial capacity.
```

### Change 2: Line 139 (added to Process list)
```markdown
4. **Elevate worksheet language**: Transform "support" → "establish," "help" → "direct," "assist" → "oversee" to demonstrate managerial capacity
```

### Change 3: Line 417
**BEFORE:**
```markdown
## Content Elimination Rules
```

**AFTER:**
```markdown
## Content Elevation Rules - Legal Advocacy
```

---

## Next Steps

1. **Approve PRD** - Review and approve this implementation plan
2. **Prioritize Templates** - Confirm priority order (High → Medium → Low)
3. **Begin Phase 1** - Start with L1A Manager and E2 Executive
4. **Test & Iterate** - Validate each template before moving to next
5. **Document Learnings** - Update PRD with any unique adaptations discovered

---

**Document Owner**: TomitaLaw AI Development
**Review Cycle**: After each phase completion
**Final Review**: Upon completion of all 8 templates
