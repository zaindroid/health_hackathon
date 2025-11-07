# AWS Bedrock Knowledge Base Setup Guide

## What's Been Implemented ✅

All the code is ready! You just need to set up AWS Bedrock Knowledge Base (15-20 minutes).

### Backend Completed:
- ✅ System prompt updated to allow medical report analysis
- ✅ Bedrock RAG retriever service (`backend/rag/retriever_bedrock.ts`)
- ✅ PDF upload endpoint with analysis
- ✅ Combined analysis (reports + vitals)
- ✅ SessionOrchestrator updated for reports
- ✅ Medical reference template created

### What RAG Will Do:
1. Analyze uploaded medical reports
2. Explain lab values in simple terms
3. Combine report data with live vitals
4. Provide recommendations (rest, monitor, see doctor, urgent care)

---

## Option 1: Quick Setup (AWS Bedrock Knowledge Base) - RECOMMENDED

**Time:** 15-20 minutes
**Cost:** ~$0.10 per 1000 queries (very affordable)

### Step 1: Create S3 Bucket for Medical Knowledge

```bash
# Log in to AWS Console or use CLI
aws s3 mb s3://health-helper-medical-kb

# Upload medical reference
cd /home/zainey/healthy_hack
aws s3 sync medical_references/ s3://health-helper-medical-kb/
```

### Step 2: Create Knowledge Base in AWS Console

1. **Open AWS Console** → Navigate to **Amazon Bedrock**

2. **Go to Knowledge Bases** (left sidebar)

3. **Click "Create knowledge base"**

4. **Configuration:**
   ```
   Name: health-helper-medical-kb
   Description: Medical knowledge base for patient report analysis
   IAM Role: Create and use a new service role
   ```

5. **Data Source:**
   ```
   Data source name: medical-references
   S3 URI: s3://health-helper-medical-kb/
   ```

6. **Embeddings Model:**
   ```
   Select: Titan Embeddings G1 - Text
   (amazon.titan-embed-text-v1)
   ```

7. **Vector Database:**
   ```
   Choose: Amazon OpenSearch Serverless (Quick create)
   Collection name: health-helper-kb
   ```

8. **Click "Next"** through remaining screens, then **"Create"**

### Step 3: Sync Data Source

1. After creation, you'll see your Knowledge Base page
2. Click on the data source name
3. **Click "Sync"** button
4. Wait 5-10 minutes for indexing to complete
5. Status will change to "Ready"

### Step 4: Get Knowledge Base ID

1. On the Knowledge Base page, look for **Knowledge base ID**
2. It will look like: `kb-abc123def456ghi`
3. **Copy this ID**

### Step 5: Update Backend Configuration

Edit `backend/.env`:

```bash
# Add this line (replace with your actual KB ID)
AWS_BEDROCK_KB_ID=kb-abc123def456ghi
```

### Step 6: Test!

```bash
# Restart backend
cd backend
npm run dev

# You should see:
# ✅ Bedrock Knowledge Base RAG initialized
# Knowledge Base ID: kb-abc123def456ghi
```

---

## Option 2: Skip RAG for Now (Test Without It)

**The app will work without RAG**, but won't provide detailed medical analysis.

### What Happens Without RAG:
- ✅ PDF upload still works
- ✅ Text extraction works
- ❌ No medical analysis (just says "Enable AWS Bedrock Knowledge Base for analysis")
- ✅ Everything else works normal (vitals, conversation, etc.)

### To Skip RAG:
1. Don't set `AWS_BEDROCK_KB_ID` in `.env`
2. The system will detect RAG is not configured and skip it
3. You'll see: `⚠️  Bedrock Knowledge Base not configured (optional)`

---

## Testing RAG

### Test 1: Upload Sample Report

Create a test file `test_report.txt`:
```
PATIENT BLOOD TEST RESULTS

Hemoglobin: 10.2 g/dL (Low)
Normal Range: 12-16 g/dL

White Blood Cell Count: 8,500 cells/μL (Normal)
Normal Range: 4,000-11,000 cells/μL

Glucose (Fasting): 105 mg/dL (Prediabetes)
Normal Range: 70-100 mg/dL
```

### Test via API:

```bash
# Start a session
SESSION_ID=$(curl -X POST http://localhost:3001/api/session/start \
  -H "Content-Type: application/json" \
  -d '{"role": "patient", "useCase": "test"}' \
  | jq -r '.sessionId')

echo "Session ID: $SESSION_ID"

# Upload report (with RAG)
curl -X POST http://localhost:3001/api/session/upload-report \
  -F "file=@test_report.txt" \
  -F "sessionId=$SESSION_ID"

# You should get detailed analysis like:
# "Your hemoglobin is 10.2 g/dL, which is below normal (12-16). This suggests mild anemia..."
```

---

## Expanding Medical Knowledge

### Add More Reference Documents:

**1. Create `medical_references/symptom_assessment.md`:**
```markdown
# Symptom Red Flags

## Headache
- Thunderclap headache → URGENT
- With fever + stiff neck → Possible meningitis
- After head injury → See doctor immediately

## Chest Pain
- Crushing, radiating to arm → CALL 911
- Worse with exertion → See cardiologist
```

**2. Create `medical_references/medication_info.md`:**
```markdown
# Common Medications

## Blood Pressure Medications
- ACE Inhibitors (ends in -pril)
- Beta Blockers (ends in -olol)
...
```

**3. Upload to S3:**
```bash
aws s3 sync medical_references/ s3://health-helper-medical-kb/
```

**4. Re-sync Knowledge Base:**
- Go to AWS Console → Bedrock → Your KB → Data Sources
- Click "Sync" again

---

## Troubleshooting

### "Knowledge Base not configured"
- Check `.env` file has `AWS_BEDROCK_KB_ID=kb-xxxxx`
- Restart backend after adding env variable
- Verify KB ID is correct in AWS Console

### "Failed to retrieve knowledge"
- Check AWS credentials are set (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
- Verify IAM user has Bedrock permissions
- Check Knowledge Base status is "Ready" in console

### "No analysis returned"
- Make sure data source is synced (check AWS Console)
- Verify S3 bucket has the medical reference files
- Check CloudWatch logs in AWS for errors

### PDF Upload Fails
- Check file is actual PDF (not renamed .txt)
- Verify file size <10MB
- Check `backend/uploads/` directory exists and is writable

---

## Cost Breakdown

### AWS Bedrock Knowledge Base:
- **Embeddings:** ~$0.0001 per 1000 tokens
- **Queries:** ~$0.10 per 1000 queries
- **OpenSearch Serverless:** ~$0.24/hour (~$175/month for always-on)
  - Or use Aurora Serverless v2 (~$40/month with auto-scaling)

### For MVP/Testing:
- First 1000 queries: ~$0.10
- With 100 queries/day: ~$3/month
- **Very affordable for development!**

### Alternative (If Cost Concerned):
- Use **Amazon Kendra Developer Edition**: $810/month but includes healthcare-specific search
- Or implement your own vector DB with **Pinecone free tier** or **ChromaDB local**

---

## Next Steps After Setup

Once RAG is working:

1. ✅ Test PDF upload with real medical reports
2. ✅ Test combined analysis (report + live vitals)
3. ✅ Try different medical queries to train the system
4. ✅ Add more medical reference documents
5. ✅ Frontend integration (PDF uploader component)

---

## Summary

**Without RAG:**
- App works, but no medical report analysis
- Still useful for vitals checking and conversation

**With RAG:**
- Full medical report analysis
- Lab value explanations
- Combined analysis with live vitals
- Intelligent recommendations

**Setup Time:** 15-20 minutes if you do it now!

**Ready to set it up?** Let me know if you need help with any step!
