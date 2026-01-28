# Update Checklist

Use this checklist when completing each step to keep all documentation current.

## ✅ When Completing a Step

### 1. Code Changes
- [ ] Implement all features for the step
- [ ] Test thoroughly
- [ ] Commit code changes

### 2. Update PROJECT_MASTER.md
- [ ] Update version number at top (e.g., 1.0.0 → 1.1.0)
- [ ] Update "Last Updated" date at top
- [ ] Update "Status" line at top and bottom
- [ ] Mark completed items in **Feature Roadmap** section with [x]
- [ ] Add new files to **File Manifest** table with status ✅
- [ ] Update **Database Schema** if tables changed
- [ ] Document new **API Specifications** if APIs added
- [ ] Add new **Technical Decisions** with rationale
- [ ] Update **Project Statistics** (file counts, sizes, etc.)
- [ ] Add new version entry to **Change Log** section at bottom
- [ ] Update any affected **Quick Reference** commands or queries

### 3. Update CHANGELOG.md
- [ ] Move items from [Unreleased] to new [version] section
- [ ] Add date to new version section
- [ ] List all Added/Changed/Fixed items
- [ ] Update [Unreleased] with next step's plans
- [ ] Keep version format consistent

### 4. Update README.md
- [ ] Update feature status if needed
- [ ] Add new scripts to "Available Scripts" section
- [ ] Update "Seeded Data" section if data changed
- [ ] Add new environment variables to template
- [ ] Update "Next Steps" section

### 5. Create Step Completion Report
- [ ] Create STEPX_COMPLETE.md file
- [ ] List all files created/modified
- [ ] Show exact code snippets for key files
- [ ] Provide commands to run
- [ ] List "how to test" instructions
- [ ] Include "done criteria" checklist

### 6. Update .env.example
- [ ] Add new environment variables if needed
- [ ] Update comments for clarity

### 7. Git Commit
- [ ] Stage all documentation files
- [ ] Commit with format: `Release vX.X.X: Step X complete`
- [ ] Push to repository

---

## 📋 Quick Reference

### Files to Always Update

1. **PROJECT_MASTER.md** - Master reference (most important!)
2. **CHANGELOG.md** - Version history
3. **README.md** - User-facing guide
4. **STEPX_COMPLETE.md** - Create new completion report

### Files to Update If Applicable

- **package.json** - If adding dependencies
- **.env.example** - If adding environment variables
- **tsconfig.json** - If changing TypeScript config
- Database client files - If schema changes

---

## 🎯 Per-Step Specific Updates

### Step 2: Chat Interface
- [ ] Add chat API routes to API Specifications
- [ ] Document 4 tool implementations
- [ ] Update File Manifest with new components
- [ ] Add chat commands to Quick Reference

### Step 3: Conversation History
- [ ] Document conversation viewer APIs
- [ ] Add trace inspection features
- [ ] Update File Manifest with viewer components

### Step 4: Teaching Loop
- [ ] Document notes and tags APIs
- [ ] Add teaching loop workflows
- [ ] Update with frequency analysis queries

### Step 5: Evaluations
- [ ] Document eval runner APIs
- [ ] Add eval code execution details
- [ ] Document LLM judge implementation

### Step 6: Validation
- [ ] Document TPR/TNR calculation
- [ ] Add validation metrics APIs
- [ ] Update with statistical formulas

---

## ✏️ Example Update

### Before (v1.0.0):
```markdown
**Version**: 1.0.0 (Step 1 Complete)
**Status**: Foundation Complete, Ready for Step 2

### ✅ Step 1: Foundation (COMPLETE)
- [x] Next.js + TypeScript setup

### 🎯 Step 2: Chat Interface (NEXT)
- [ ] Chat UI
```

### After (v1.1.0):
```markdown
**Version**: 1.1.0 (Step 2 Complete)
**Status**: Chat Interface Complete, Ready for Step 3

### ✅ Step 1: Foundation (COMPLETE)
- [x] Next.js + TypeScript setup

### ✅ Step 2: Chat Interface (COMPLETE)
- [x] Chat UI
- [x] Tool implementations
```

---

## 🔍 Verification

Before considering a step complete, verify:

✅ All checkboxes in this file are checked
✅ PROJECT_MASTER.md version matches current step
✅ CHANGELOG.md has entry for new version
✅ README.md reflects current features
✅ New STEPX_COMPLETE.md exists
✅ All code is committed
✅ All documentation is committed
✅ Project can be initialized from scratch with docs

---

## 💡 Tips

- **Update as you go**: Don't wait until the end to update docs
- **Be specific**: Include exact file paths and line numbers
- **Test instructions**: Verify all commands in docs actually work
- **Keep consistent**: Use same formatting throughout
- **Link files**: Use relative paths for cross-references
- **Date format**: Always use YYYY-MM-DD format

---

**This checklist should be reviewed at the START of each step to know what documentation will need updating!**
