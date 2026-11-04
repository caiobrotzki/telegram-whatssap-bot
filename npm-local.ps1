param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Argumentos)
$nodeExecutavel = (Get-Command node -ErrorAction Stop).Source
$npmCli = Join-Path (Split-Path $nodeExecutavel) 'node_modules\npm\bin\npm-cli.js'
if (!(Test-Path -LiteralPath $npmCli)) { throw 'npm não encontrado junto do Node.js. Reinstale o Node.js LTS.' }
& $nodeExecutavel $npmCli @Argumentos
exit $LASTEXITCODE
