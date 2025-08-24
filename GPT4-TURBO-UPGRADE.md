# GPT-4 Turbo Upgrade - Context Window Fix

## Overview

This document outlines the upgrade from GPT-4 to GPT-4 Turbo to resolve OpenAI context window limitations for processing 90-minute Hebrew lessons in the Limud-AI system.

## Problem Solved

**Issue**: Hebrew prompts were too long for GPT-4's 8K context window, causing truncation and processing failures for lengthy lesson transcriptions.

**Solution**: Upgraded to GPT-4 Turbo with 128K context window (16x larger capacity).

## Changes Made

### 1. Model Configuration Updates (`server/config/ai-services.js`)

**Before:**
```javascript
text_generation: {
  openai: {
    model: 'gpt-4',
    max_tokens: 2000
  }
},
summary_generation: {
  openai: {
    model: 'gpt-4', 
    max_tokens: 1500
  }
},
question_generation: {
  openai: {
    model: 'gpt-4',
    max_tokens: 2500
  }
}
```

**After:**
```javascript
text_generation: {
  openai: {
    model: 'gpt-4-turbo',
    max_tokens: 4000
  }
},
summary_generation: {
  openai: {
    model: 'gpt-4-turbo',
    max_tokens: 3000
  }
},
question_generation: {
  openai: {
    model: 'gpt-4-turbo',
    max_tokens: 4000
  }
}
```

### 2. Cost Tracking Updates

Added GPT-4 Turbo pricing (actually cheaper than GPT-4):
```javascript
'gpt-4-turbo': {
  input_tokens: 0.00001,  // $0.01 per 1K tokens
  output_tokens: 0.00003  // $0.03 per 1K tokens
}
```

### 3. Rate Limits Adjustment

Increased token limits to match GPT-4 Turbo capabilities:
```javascript
tokens_per_minute: 150000  // Increased from 40,000
```

### 4. New Token Management Utility (`server/utils/TokenCounter.js`)

Created comprehensive token counting and context window management:
- **Token estimation** for Hebrew and English text
- **Context window validation** before API calls
- **Content chunking** for extremely large content (fallback)
- **Dynamic max_tokens optimization**
- **Enhanced error handling**

### 5. Enhanced Error Handling

Updated both `SummaryService.js` and `QuestionService.js` with:
- **Pre-validation** of content size
- **Dynamic token optimization**
- **Detailed error messages** for context issues
- **Graceful fallback handling**

## Capacity Analysis

### GPT-4 Turbo Context Window: 128,000 tokens

**For 90-minute Hebrew lesson:**
- **Transcription**: ~25,000 tokens (Hebrew text)
- **Hebrew prompts**: ~2,000 tokens
- **System messages**: ~500 tokens
- **Total input**: ~27,500 tokens
- **Available for output**: ~100,500 tokens
- **Utilization**: ~21% of context window

**This allows for:**
- ✅ Complete 90-minute lesson processing
- ✅ Detailed educational summaries (3,000 tokens)
- ✅ Comprehensive question sets (4,000 tokens)
- ✅ Rich explanations and learning objectives
- ✅ Room for even longer lessons (up to 3+ hours)

## Benefits

### 1. **Eliminates Context Window Errors**
- No more truncated Hebrew prompts
- Complete lesson content processing
- Reliable handling of long transcriptions

### 2. **Improved Content Quality**
- Longer, more detailed summaries
- More comprehensive question sets
- Better educational content generation

### 3. **Cost Efficiency**
- GPT-4 Turbo is cheaper per token than GPT-4
- Reduced API calls due to larger context handling
- Better cost tracking and estimation

### 4. **Enhanced Reliability**
- Robust error handling for edge cases
- Automatic token optimization
- Graceful degradation for extreme cases

## Monitoring and Maintenance

### 1. **Token Usage Monitoring**

Monitor the `ai_service_usage` table for:
```sql
SELECT 
  AVG(tokens_used) as avg_tokens,
  MAX(tokens_used) as max_tokens,
  COUNT(*) as total_requests
FROM ai_service_usage 
WHERE service_provider = 'openai' 
  AND request_timestamp > datetime('now', '-7 days');
```

### 2. **Cost Tracking**

Track costs with the updated pricing:
```sql
SELECT 
  SUM(cost_usd) as total_cost,
  AVG(cost_usd) as avg_cost_per_request,
  service_type
FROM ai_service_usage 
WHERE service_provider = 'openai'
  AND request_timestamp > datetime('now', '-30 days')
GROUP BY service_type;
```

### 3. **Performance Monitoring**

Check processing times and success rates:
```sql
SELECT 
  AVG(processing_time) as avg_processing_time,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_jobs,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs
FROM ai_processing_jobs 
WHERE created_at > datetime('now', '-7 days');
```

## Testing Recommendations

### 1. **Test with Various Lesson Lengths**
- Short lessons (10-15 minutes)
- Medium lessons (30-45 minutes)
- Long lessons (60-90 minutes)
- Extra-long lessons (90+ minutes)

### 2. **Monitor Context Window Utilization**
Check console logs for context analysis output:
```
Content may exceed context window: { utilizationPercent: 85 }
Optimized max_tokens from 4000 to 3200
```

### 3. **Verify Hebrew Content Quality**
Ensure Hebrew educational content maintains quality with:
- Proper Hebrew grammar and syntax
- Educational structure and clarity
- Appropriate question difficulty levels

## Troubleshooting

### Common Issues and Solutions

**1. "Content too large for context window"**
- Should be rare with 128K window
- Check if transcription is unusually long (3+ hours)
- Verify token counting accuracy

**2. "Rate limit exceeded"**
- Normal with heavy usage
- Implement exponential backoff (already included)
- Consider upgrading OpenAI plan if needed

**3. High costs**
- Monitor usage patterns
- Consider using GPT-4o-mini for simpler tasks
- Implement content optimization if needed

## Future Enhancements

### 1. **Model Selection Strategy**
- Use GPT-4o-mini for simple summaries
- Use GPT-4 Turbo for complex educational content
- Dynamic model selection based on content complexity

### 2. **Advanced Token Optimization**
- Real-time token counting with tiktoken library
- Smarter content chunking algorithms
- Prompt compression techniques

### 3. **Multi-Model Support**
- Add support for other large context models
- Implement model failover strategies
- Cost optimization across different providers

## Conclusion

The GPT-4 Turbo upgrade provides a robust solution for processing long Hebrew educational content without context window limitations. The 128K context window easily accommodates 90-minute lessons while providing room for growth and enhanced educational content generation.
