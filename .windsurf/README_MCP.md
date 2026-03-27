# 🔌 MCP Setup for BBQ Grill System

Model Context Protocol (MCP) servers เพิ่มความสามารถให้ Cascade AI ในการจัดการระบบ BBQ Grill POS

---

## 📦 Installed MCPs

### Currently Active
- ✅ **Filesystem** - File operations
- ✅ **Playwright** - Browser automation & testing
- ✅ **Sequential Thinking** - Problem solving

### Recommended for BBQ Grill (Phase 1)
- 🔲 **Supabase** - Database management
- 🔲 **Postman** - API testing
- 🔲 **Snyk** - Security scanning

---

## 🚀 Quick Start

### 1. Install Phase 1 MCPs

**Supabase MCP:**
1. Open Windsurf
2. `Ctrl+Shift+P` → "MCP Marketplace"
3. Search "Supabase" (Official)
4. Click **Install**
5. Restart Windsurf

**Postman MCP:**
1. MCP Marketplace → "Postman"
2. Install
3. Get API Key: https://postman.com/settings/api-keys
4. Configure in `mcp-settings.json`
5. Restart Windsurf

**Snyk MCP:**
1. MCP Marketplace → "Snyk"
2. Install
3. Get Token: https://snyk.io/account
4. Configure in `mcp-settings.json`
5. Restart Windsurf

---

## ⚙️ Configuration

### Location
- **Windows**: `%APPDATA%\Windsurf\mcp-settings.json`
- **macOS**: `~/Library/Application Support/Windsurf/mcp-settings.json`
- **Linux**: `~/.config/Windsurf/mcp-settings.json`

### Template
See: `.windsurf/mcp-config-template.json`

### Example Configuration
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-supabase"],
      "env": {
        "SUPABASE_URL": "http://localhost:3306",
        "SUPABASE_KEY": "bbq_pass_CHANGE_ME"
      }
    }
  }
}
```

---

## 🧪 Testing

### Test Supabase MCP
```
Ask Cascade:
"Query ตาราง queues ทั้งหมดที่ queue_status = 'WAITING'"
```

### Test Postman MCP
```
Ask Cascade:
"Test POST /api/auth/login endpoint ด้วย username: admin, password: admin1234"
```

### Test Snyk MCP
```
Ask Cascade:
"Scan bbq_angular/package.json สำหรับ vulnerabilities"
```

---

## 📚 Documentation

- **Installation Guide**: `MCP_INSTALLATION_GUIDE.md`
- **Usage Examples**: `MCP_USAGE_EXAMPLES.md`
- **Quick Reference**: `MCP_QUICK_REFERENCE.md`
- **Config Template**: `.windsurf/mcp-config-template.json`

---

## 🎯 Common Tasks

### Database Operations
```
"Query revenue วันนี้"
"หา customers ที่จองบ่อยที่สุด"
"วิเคราะห์ queue wait time"
```

### API Testing
```
"Test complete queue flow"
"Load test /api/queues"
"Debug payment endpoint"
```

### Security Scanning
```
"Scan all dependencies"
"Check Docker security"
"Generate security report"
```

---

## 🆘 Troubleshooting

### MCP Not Working
1. Check API keys valid
2. Restart Windsurf
3. Check logs: `Help → Developer Tools → Console`

### Connection Issues
1. Verify credentials
2. Check network/firewall
3. Try reinstall MCP

### Rate Limits
1. Wait for reset
2. Upgrade to paid tier
3. Use alternative MCP

---

## 📈 Roadmap

### Phase 1 (Week 1) ✅
- [x] Document MCP requirements
- [x] Create installation guides
- [x] Prepare configuration templates
- [ ] Install Supabase MCP
- [ ] Install Postman MCP
- [ ] Install Snyk MCP

### Phase 2 (Week 2)
- [ ] Install Slack MCP
- [ ] Setup notifications
- [ ] Install Payment MCP
- [ ] Configure alerts

### Phase 3 (Month 1)
- [ ] Install SonarQube MCP
- [ ] Install Notion/Asana MCP
- [ ] Install Deployment MCPs
- [ ] Full automation setup

---

## 🔗 Links

- **MCP Protocol**: https://modelcontextprotocol.io/
- **Windsurf Docs**: https://docs.codeium.com/windsurf/mcp
- **Supabase MCP**: https://github.com/modelcontextprotocol/servers
- **Postman API**: https://learning.postman.com/docs/developer/postman-api/
- **Snyk Docs**: https://docs.snyk.io/

---

Last Updated: 2026-03-16  
Maintained by: Cascade AI
