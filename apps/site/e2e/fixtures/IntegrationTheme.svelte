<script lang="ts">
  import { GoogleAd, GoogleAdsConversion, useSvedocsTheme } from 'svedocs/theme';
  const theme = useSvedocsTheme();
</script>

<h2>Custom theme integration</h2>
<GoogleAd config={$theme.config} name="article" routeKey={$theme.page?.routePath ?? ''} />
<GoogleAdsConversion config={$theme.config} name="custom" transactionId="test-transaction" />
