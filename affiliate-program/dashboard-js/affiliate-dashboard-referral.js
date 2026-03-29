Object.assign(window.AXIOM_AFFILIATE_DASHBOARD, {
  generateTrackingLink() {
    const pathEl = document.getElementById('affiliateTargetPath');
    const output = document.getElementById('affiliateGeneratedLink');
    const copyBtn = document.getElementById('affiliateCopyGeneratedLinkBtn');
    const code = (this.affiliateProfile && this.affiliateProfile.referral_code) || '';

    const customPath = pathEl && pathEl.value ? pathEl.value.trim() : '/';
    const finalUrl = code ? this.buildAffiliateTrackingUrl(customPath, code) : '';

    if (output) {
      output.value = finalUrl;
    }

    if (copyBtn) {
      copyBtn.dataset.affiliateCopy = finalUrl;
    }
  },

  buildAffiliateTrackingUrl(targetPath, referralCode) {
    const normalizedCode = this.normalizeCode(referralCode);
    const baseOrigin = window.location.origin;

    let resolvedPath = '/';
    if (typeof targetPath === 'string' && targetPath.trim()) {
      resolvedPath = targetPath.trim();
    }

    if (!resolvedPath.startsWith('/')) {
      resolvedPath = '/' + resolvedPath.replace(/^\.?\//, '');
    }

    const url = new URL(resolvedPath, baseOrigin);
    if (normalizedCode) {
      url.searchParams.set('ref', normalizedCode);
    }

    return url.toString();
  },

  async updateOwnReferralCode() {
    const supabase = this.getSupabase();
    const input = this.getReferralCodeInput();
    const saveBtn = this.getReferralCodeSaveButton();

    if (!supabase || !this.affiliateProfile || !this.affiliateProfile.id || !input) {
      this.setReferralCodeStatus('Unable to update code right now.', 'error');
      return;
    }

    const nextCode = this.normalizeCode(input.value);

    if (!nextCode || nextCode.length < 4) {
      this.setReferralCodeStatus('Code must be at least 4 characters.', 'error');
      return;
    }

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }

    this.setReferralCodeStatus('Saving code...', '');

    try {
      const { error } = await supabase
        .from('affiliates')
        .update({
          referral_code: nextCode,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.affiliateProfile.id);

      if (error) {
        throw error;
      }

      this.affiliateProfile.referral_code = nextCode;
      this.setText('affiliateDashboardCode', nextCode);
      this.syncReferralCodeUi(nextCode);
      this.setReferralCodeStatus('Code updated successfully.', '');
    } catch (error) {
      console.error('[Affiliate Dashboard] updateOwnReferralCode failed:', error);
      this.setReferralCodeStatus(
        error.message || 'Unable to update referral code.',
        'error'
      );
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Code';
      }
    }
  }
});
