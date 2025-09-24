DS-160 PROMPT VERSION CONTROL
==============================

CURRENT ACTIVE VERSION: ds160_prompt_20240915_v4.txt

VERSION NAMING CONVENTION:
- Format: ds160_prompt_YYYYMMDD.txt (or with suffix like _complete, _optimized, _evisa)
- Date represents when the prompt was last modified or created

CHANGELOG:
----------

ds160_prompt_20240915_v4.txt (CURRENT)
- Date: September 15, 2024 (v4)
- Changes: Fixed passport issuance field confusion - separated issuingAuthority from issueCountry
           issuingAuthority = government/country that issued the passport (e.g., CHN for China)
           issueCountry = physical location country where issued (e.g., JPN if issued at Chinese embassy in Tokyo)
           issueCity = city where issued (e.g., TOKYO)
- Base: Derived from ds160_prompt_20240915_v3.txt
- Status: ACTIVE - Use this version for production

ds160_prompt_20240915_v3.txt (ARCHIVED)
- Date: September 15, 2024 (v3)
- Changes: Added otherPurposeDetail field for specific visa subtypes (H-1B, L-1, E-2, etc.)
           Added requirement for lengthOfStay fields with estimation guidance
- Base: Derived from ds160_prompt_20240915_v2.txt
- Status: ARCHIVED

ds160_prompt_20240915_v2.txt (ARCHIVED)
- Date: September 15, 2024 (v2)
- Changes: Added all missing Additional Work/Education/Training fields
- Status: ARCHIVED

ds160_prompt_20240915.txt (ARCHIVED)
- Date: September 15, 2024 (v1)
- Changes: Fixed education institution address structure to properly specify street1, street2, city, state, postalCode, country fields
- Base: Derived from ds160_prompt_complete_optimized.txt
- Status: ARCHIVED

ds160_prompt_20240912_optimized.txt (ARCHIVED)
- Date: September 12, 2024
- Changes: Optimized version of complete prompt
- Issue: Education address structure was incomplete (only had "address: {}" without field specification)
- Status: ARCHIVED

ds160_prompt_20240912_complete.txt (ARCHIVED)
- Date: September 12, 2024
- Changes: Complete DS-160 prompt with all fields
- Issue: Education address structure was incomplete
- Status: ARCHIVED

ds160_prompt_20240911_evisa.txt (ARCHIVED)
- Date: September 11, 2024
- Changes: Added E-visa specific sections
- Status: ARCHIVED

NOTES:
------
- Always use the most recent dated version (highest date number)
- When making changes, create a new file with today's date
- Keep old versions for reference and rollback if needed
- Update this README when creating new versions