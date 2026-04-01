# Gemini Request Reference (PowerShell)

Use this request shape for Gemini calls from PowerShell.

## Endpoint Pattern

`https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}`

## Canonical Script

```powershell
# Read model from environment, fallback to MVP default
$model = if ($env:GEMINI_MODEL) { $env:GEMINI_MODEL } else { "gemini-2.5-flash-lite" }

# Read key from environment variable (do not hardcode)
$apiKey = $env:GEMINI_API_KEY

$uri = "https://generativelanguage.googleapis.com/v1beta/models/$($model):generateContent?key=$apiKey"

$headers = @{
    "Content-Type" = "application/json"
}

$body = @{
    contents = @(
        @{
            parts = @(
                @{ text = "Hello Gemini! Say hi in a single sentence." }
            )
        }
    )
    generationConfig = @{
        temperature = 0.7
        maxOutputTokens = 50
    }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $body

    if ($response.candidates) {
        $response.candidates[0].content.parts[0].text
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__

    if ($statusCode -eq 429) {
        Write-Host "Rate limit. Wait 60s." -ForegroundColor Yellow
    } elseif ($statusCode -eq 403) {
        Write-Host "403 - Key lacks access to this model. Fall back to gemini-2.0-flash." -ForegroundColor Red
    } else {
        Write-Error "Error $statusCode`: $($_.Exception.Message)"
    }
}
```

## Notes

- Keep the API key in `GEMINI_API_KEY`.
- Keep default model in `GEMINI_MODEL` and override only when needed.
- Use `v1beta` with `generateContent` for this request format.