/*
  # Update Google Ads Validation Rules - iOS/Safari Reality

  ## Changes
  - Remove referer requirement for Google Ads
  - iOS/Safari/WebView frequently don't send referer
  - gclid validity is the PRIMARY signal, not referer
  
  ## Reality
  - Real Google Ads traffic (especially mobile iOS) often has:
    - Valid gclid
    - No referer (iOS privacy, Safari restrictions, WebView)
    - Low initial human signals (landing page)
  - These are LEGITIMATE clicks with economic value
  
  ## Philosophy
  - Protect ROI, don't "educate" Google Ads
  - gclid validity >>> referer presence
*/

-- Update Google Ads rule to NOT require referer
UPDATE click_id_validation_rules
SET 
  requires_referer = false,
  updated_at = now()
WHERE network = 'google_ads';

-- Add note about iOS/Safari reality
COMMENT ON COLUMN click_id_validation_rules.requires_referer IS 
'Whether referer is required. Note: iOS/Safari often don''t send referer even for legitimate traffic.';
