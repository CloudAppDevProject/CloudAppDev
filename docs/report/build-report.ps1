# Build Report Script
# Assembles all markdown files in order and converts to PDF
# Requires:
#   - pandoc (https://pandoc.org/installing.html)
#   - svgexport: npm install -g svgexport
#   - mermaid-cli (optional): npm install -g @mermaid-js/mermaid-cli
#   - draw.io Desktop (optional, for .drawio.svg files): https://www.drawio.com/

param(
    [string]$OutputName = "CloudAppDev_Report",
    [switch]$KeepMarkdown,
    [switch]$KeepImages
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Create temp directory for rendered images
$tempDir = Join-Path $scriptDir "temp_images"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Get all numbered markdown files and sort them
$mdFiles = Get-ChildItem -Path "." -Filter "*.md" |
    Where-Object { $_.Name -match "^\d+_" } |
    Sort-Object { [int]($_.Name -split "_")[0] }

if ($mdFiles.Count -eq 0) {
    Write-Error "No numbered markdown files found (e.g., 1_requirements.md)"
    exit 1
}

Write-Host "Found $($mdFiles.Count) markdown files:" -ForegroundColor Cyan
$mdFiles | ForEach-Object { Write-Host "  - $($_.Name)" }

# Check for tools
$hasSvgExport = Get-Command svgexport -ErrorAction SilentlyContinue
$hasMermaid = Get-Command mmdc -ErrorAction SilentlyContinue

# Check for draw.io Desktop CLI
$drawioPath = $null
$drawioLocations = @(
    "${env:ProgramFiles}\draw.io\draw.io.exe",
    "${env:LOCALAPPDATA}\Programs\draw.io\draw.io.exe",
    "C:\Program Files\draw.io\draw.io.exe"
)
foreach ($loc in $drawioLocations) {
    if (Test-Path $loc) {
        $drawioPath = $loc
        break
    }
}

if (-not $hasSvgExport) {
    Write-Warning "svgexport not found. Install with: npm install -g svgexport"
    Write-Warning "Regular SVG images will not be converted."
} else {
    Write-Host "svgexport found, will convert regular SVG to PNG" -ForegroundColor Green
}

if ($drawioPath) {
    Write-Host "draw.io Desktop found at: $drawioPath" -ForegroundColor Green
    Write-Host "  -> Will use draw.io for .drawio.svg files (proper rendering)" -ForegroundColor Green
} else {
    Write-Warning "draw.io Desktop not found. .drawio.svg files may render incorrectly."
    Write-Warning "Install from: https://www.drawio.com/"
}

if ($hasMermaid) {
    Write-Host "Mermaid CLI found, will render diagrams" -ForegroundColor Green
}

# Collect all SVGs and Mermaid diagrams, convert them
$combinedMd = "$OutputName.md"
$combinedContent = @()
$imageCount = 0

foreach ($file in $mdFiles) {
    Write-Host "`nProcessing: $($file.Name)" -ForegroundColor Green

    # Read file content, handle empty files
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue

    if ([string]::IsNullOrWhiteSpace($content)) {
        Write-Warning "  Skipping empty file: $($file.Name)"
        continue
    }

    # Convert SVG images to PNG
    # Match image references: ![alt](path.svg)
    $svgPattern = '!\[([^\]]*)\]\(([^)]+\.svg)\)'
    $svgMatches = [regex]::Matches($content, $svgPattern)

    foreach ($match in $svgMatches) {
        $altText = $match.Groups[1].Value
        $svgPath = $match.Groups[2].Value

        # Resolve the SVG path relative to the markdown file
        $resolvedSvgPath = Join-Path $scriptDir $svgPath
        if (-not (Test-Path $resolvedSvgPath)) {
            Write-Warning "  SVG not found: $svgPath"
            continue
        }

        $imageCount++
        $pngFile = Join-Path $tempDir "image_$imageCount.png"

        # Check if this is a draw.io SVG file
        $isDrawioSvg = $svgPath -like "*.drawio.svg"

        if ($isDrawioSvg -and $drawioPath) {
            # Use draw.io Desktop CLI for proper rendering
            Write-Host "  Converting draw.io SVG: $svgPath" -ForegroundColor Yellow

            # draw.io CLI: --export --format png --output <output> <input>
            # Use --width instead of --scale to ensure the full diagram is captured
            # A large width with --crop ensures proper aspect ratio is maintained
            $drawioArgs = @(
                "--export",
                "--format", "png",
                "--width", "3000",
                "--crop",
                "--border", "10",
                "--output", $pngFile,
                $resolvedSvgPath
            )

            try {
                Start-Process -FilePath $drawioPath -ArgumentList $drawioArgs -Wait -NoNewWindow -RedirectStandardError "$tempDir\drawio_err.txt" 2>$null

                # draw.io may take a moment to write the file
                Start-Sleep -Milliseconds 500

                if (Test-Path $pngFile) {
                    $replacement = "![$altText]($pngFile)"
                    $content = $content.Replace($match.Value, $replacement)
                    Write-Host "    -> image_$imageCount.png (draw.io)" -ForegroundColor DarkGray
                } else {
                    Write-Warning "  Failed to convert with draw.io: $svgPath"
                    # Fallback to svgexport if available
                    if ($hasSvgExport) {
                        Write-Host "    Falling back to svgexport..." -ForegroundColor Yellow
                        & svgexport $resolvedSvgPath $pngFile 1200: 2>&1 | Out-Null
                        if (Test-Path $pngFile) {
                            $replacement = "![$altText]($pngFile)"
                            $content = $content.Replace($match.Value, $replacement)
                            Write-Host "    -> image_$imageCount.png (svgexport fallback)" -ForegroundColor DarkGray
                        }
                    }
                }
            } catch {
                Write-Warning "  Error running draw.io: $_"
            }
        } elseif ($hasSvgExport) {
            # Use svgexport for regular SVGs
            Write-Host "  Converting SVG: $svgPath" -ForegroundColor Yellow

            # svgexport input.svg output.png [width]
            & svgexport $resolvedSvgPath $pngFile 1200: 2>&1 | Out-Null

            if (Test-Path $pngFile) {
                # Replace SVG reference with PNG
                $replacement = "![$altText]($pngFile)"
                $content = $content.Replace($match.Value, $replacement)
                Write-Host "    -> image_$imageCount.png" -ForegroundColor DarkGray
            } else {
                Write-Warning "  Failed to convert: $svgPath"
            }
        } elseif ($isDrawioSvg) {
            Write-Warning "  Cannot convert draw.io SVG (draw.io Desktop not installed): $svgPath"
        } else {
            Write-Warning "  Cannot convert SVG (svgexport not installed): $svgPath"
        }
    }

    # Convert Mermaid diagrams to PNG
    if ($hasMermaid) {
        $mermaidPattern = '```mermaid\r?\n([\s\S]*?)```'
        $mermaidMatches = [regex]::Matches($content, $mermaidPattern)

        foreach ($match in $mermaidMatches) {
            $imageCount++
            $mermaidCode = $match.Groups[1].Value
            $mmdFile = Join-Path $tempDir "diagram_$imageCount.mmd"
            $pngFile = Join-Path $tempDir "diagram_$imageCount.png"

            Set-Content -Path $mmdFile -Value $mermaidCode -Encoding UTF8

            Write-Host "  Rendering Mermaid diagram $imageCount..." -ForegroundColor Yellow

            & mmdc -i $mmdFile -o $pngFile -b white -s 2 2>&1 | Out-Null

            if (Test-Path $pngFile) {
                $replacement = "![Diagram $imageCount]($pngFile)"
                $content = $content.Replace($match.Value, $replacement)
            } else {
                Write-Warning "  Failed to render Mermaid diagram $imageCount"
            }
        }
    }

    # Handle PNG images with relative paths (copy to temp and fix path)
    $pngPattern = '!\[([^\]]*)\]\(([^)]+\.png)\)'
    $pngMatches = [regex]::Matches($content, $pngPattern)

    foreach ($match in $pngMatches) {
        $altText = $match.Groups[1].Value
        $pngPath = $match.Groups[2].Value

        # Skip if already in temp_images
        if ($pngPath -like "*temp_images*") { continue }

        $resolvedPngPath = Join-Path $scriptDir $pngPath
        if (Test-Path $resolvedPngPath) {
            $imageCount++
            $newPngFile = Join-Path $tempDir "image_$imageCount.png"
            Copy-Item $resolvedPngPath $newPngFile

            $replacement = "![$altText]($newPngFile)"
            $content = $content.Replace($match.Value, $replacement)
            Write-Host "  Copied PNG: $pngPath -> image_$imageCount.png" -ForegroundColor DarkGray
        } else {
            Write-Warning "  PNG not found: $pngPath"
        }
    }

    # Fix markdown lists: ensure blank line before list items
    # Pandoc needs a blank line before lists to render them as proper itemize environments
    # Pattern: any non-blank, non-list line followed directly by a list item "- "
    # This handles cases like:
    #   **Header**:\n- item
    #   Some text (with parens)\n- item
    #   Regular paragraph\n- item
    # But NOT: \n\n- item (already has blank line) or - item\n- item (consecutive list items)
    $content = $content -replace '([^\r\n])\r?\n(- [^\r\n])', "`$1`n`n`$2"

    # Also handle numbered lists (1. 2. etc.)
    $content = $content -replace '([^\r\n])\r?\n(\d+\. [^\r\n])', "`$1`n`n`$2"

    # Replace Unicode characters with ASCII equivalents for LaTeX compatibility

    # Remove invisible Unicode modifiers (variation selectors, zero-width chars, etc.)
    $content = $content -replace '[\uFE00-\uFE0F]', ''  # Variation Selectors
    $content = $content -replace '[\u200B-\u200D]', ''  # Zero-width spaces
    $content = $content -replace '[\u2060]', ''         # Word joiner
    $content = $content -replace '[\uFEFF]', ''         # BOM

    # Box-drawing characters
    $content = $content -replace '[┌┐└┘├┤┬┴┼╔╗╚╝╠╣╦╩╬]', '+'
    $content = $content -replace '[─═]', '-'
    $content = $content -replace '[│║]', '|'

    # Checkmarks and status symbols
    $content = $content -replace '[✅✓✔☑]', '[OK]'
    $content = $content -replace '[❌❎⛔✗✘]', '[X]'
    $content = $content -replace '[⚠⚡]', '[!]'
    $content = $content -replace '🔄', '[~]'
    $content = $content -replace '[⏳⌛]', '[...]'
    $content = $content -replace '🎯', '[*]'
    $content = $content -replace '📅', ''
    $content = $content -replace '🔧', ''
    $content = $content -replace '📦', ''
    $content = $content -replace '🚀', ''
    $content = $content -replace '💡', ''
    $content = $content -replace '📝', ''
    $content = $content -replace '🔗', ''
    $content = $content -replace '📊', ''
    $content = $content -replace '[🔒🔐]', '[LOCK]'
    $content = $content -replace '🔓', '[UNLOCK]'
    $content = $content -replace '🤖', ''
    $content = $content -replace '💰', '$'
    $content = $content -replace '💵', '$'
    $content = $content -replace '📈', ''
    $content = $content -replace '📉', ''
    $content = $content -replace '🏢', ''
    $content = $content -replace '👤', ''
    $content = $content -replace '👥', ''
    $content = $content -replace '🌐', ''
    $content = $content -replace '☁', ''
    $content = $content -replace '⚙', ''
    $content = $content -replace '🔥', ''
    $content = $content -replace '✨', ''
    $content = $content -replace '💻', ''
    $content = $content -replace '📱', ''
    $content = $content -replace '🔍', ''
    $content = $content -replace '📧', ''
    $content = $content -replace '🏷', ''

    # Arrows
    $content = $content -replace '[→➡➔➜]', '->'
    $content = $content -replace '[←➛]', '<-'
    $content = $content -replace '↑', '^'
    $content = $content -replace '↓', 'v'
    $content = $content -replace '↔', '<->'
    $content = $content -replace '[⇒⇨]', '=>'
    $content = $content -replace '[⇐⇦]', '<='

    # Other common symbols
    $content = $content -replace '[•◦▪▫]', '*'
    $content = $content -replace '[●○]', 'o'
    $content = $content -replace '[■□]', '#'
    $content = $content -replace '[▶▷►]', '>'
    $content = $content -replace '[◀◁◄]', '<'
    $content = $content -replace '[★☆✦✧]', '*'
    $content = $content -replace '…', '...'
    $content = $content -replace '–', '--'
    $content = $content -replace '—', '---'
    $content = $content -replace '×', 'x'
    $content = $content -replace '÷', '/'
    $content = $content -replace '±', '+/-'
    $content = $content -replace '≈', '~'
    $content = $content -replace '≠', '!='
    $content = $content -replace '≤', '<='
    $content = $content -replace '≥', '>='
    $content = $content -replace '∞', 'inf'
    $content = $content -replace '°', ' deg'
    # Keep € symbol - it's in Latin-1 range and pdflatex can handle it with inputenc
    $content = $content -replace '£', 'GBP'
    $content = $content -replace '¥', 'JPY'
    $content = $content -replace '©', '(c)'
    $content = $content -replace '®', '(R)'
    $content = $content -replace '™', '(TM)'

    # Remove any remaining problematic Unicode (keep basic ASCII + common Latin-1)
    # This removes emojis and other characters that pdflatex can't handle
    $content = $content -replace '[^\x00-\x7F\xA0-\xFF]', ''

    $combinedContent += $content
    $combinedContent += "`n`n\newpage`n`n"
}

# Remove trailing page break
$combinedContent = $combinedContent -join ""
$combinedContent = $combinedContent.TrimEnd() -replace "\\newpage\s*$", ""

# Write combined markdown
Set-Content -Path $combinedMd -Value $combinedContent -Encoding UTF8
Write-Host "`nCombined markdown saved to: $combinedMd" -ForegroundColor Cyan
Write-Host "Processed $imageCount images" -ForegroundColor Cyan

# Check if pandoc is available
$pandocPath = Get-Command pandoc -ErrorAction SilentlyContinue

if (-not $pandocPath) {
    Write-Warning "pandoc not found. Install it from https://pandoc.org/installing.html"
    Write-Host "Combined markdown file created: $combinedMd"
    exit 0
}

# Convert to PDF using pandoc
$pdfOutput = "$OutputName.pdf"

Write-Host "`nConverting to PDF..." -ForegroundColor Cyan

# Create a custom LaTeX header for inline code line breaking and proper encoding
$headerFile = Join-Path $tempDir "header.tex"
$headerContent = @'
% Encoding for Euro symbol and other special characters
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage{textcomp}

% Better list handling - ensure items are on separate lines
\usepackage{enumitem}
\setlist[itemize]{itemsep=0.5em, parsep=0.25em}
\setlist[enumerate]{itemsep=0.5em, parsep=0.25em}

% Prevent tight lists from collapsing
\providecommand{\tightlist}{%
  \setlength{\itemsep}{0.5em}\setlength{\parskip}{0.25em}}

% Allow line breaks in inline code (texttt)
\usepackage{xparse}
\usepackage{letltxmacro}
\LetLtxMacro{\oldtexttt}{\texttt}
\renewcommand{\texttt}[1]{%
  \begingroup
  \ttfamily
  \hyphenchar\font=45  % Allow hyphenation at hyphens
  \spaceskip=.5em plus .3em minus .2em  % Allow flexible spacing
  \xspaceskip=.6em plus .4em minus .2em
  \tolerance=9999
  \emergencystretch=3em
  \hbadness=10000
  #1%
  \endgroup
}
'@
Set-Content -Path $headerFile -Value $headerContent -Encoding UTF8

# Pandoc options - use pdflatex (more compatible with MiKTeX on Windows)
# Use listings package for code blocks with line breaking enabled
$pandocArgs = @(
    $combinedMd,
    "-o", $pdfOutput,
    "--pdf-engine=pdflatex",
    "-V", "geometry:margin=1in",
    "-V", "fontsize=11pt",
    "--toc",
    "--toc-depth=3",
    "-V", "colorlinks=true",
    "-V", "linkcolor=blue",
    "-V", "urlcolor=blue",
    "--listings",
    "-V", "lstset={breaklines=true,breakatwhitespace=false,basicstyle=\ttfamily\small,columns=fullflexible}",
    "-H", $headerFile
)

try {
    $output = & pandoc @pandocArgs 2>&1

    if ($output) {
        Write-Host $output
    }

    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nPDF created successfully: $pdfOutput" -ForegroundColor Green

        # Clean up
        if (-not $KeepMarkdown) {
            Remove-Item $combinedMd -Force
            Write-Host "Cleaned up temporary markdown file."
        }
    } else {
        Write-Error "PDF conversion failed."
        Write-Host "Combined markdown available at: $combinedMd"
        Write-Host "Images available in: $tempDir"
    }
} catch {
    Write-Error "Error running pandoc: $_"
    Write-Host "Combined markdown available at: $combinedMd"
}
