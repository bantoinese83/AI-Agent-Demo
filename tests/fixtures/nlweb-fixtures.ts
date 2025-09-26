// Test fixtures for NLWeb functionality

export const mockSchemaOrgContent = {
  '@type': 'Article',
  '@id': 'https://example.com/ai-guide',
  name: 'Artificial Intelligence Development Guide',
  description: 'Comprehensive guide to AI development covering ethical considerations, data quality, and model performance.',
  articleBody: 'Artificial Intelligence development requires careful consideration of ethical implications, data quality, and model performance. Modern AI systems use large language models trained on vast datasets to perform tasks like text generation, code completion, and question answering.',
  author: {
    '@type': 'Person',
    name: 'AI Research Team'
  },
  datePublished: '2024-01-01',
  url: 'https://example.com/ai-guide'
};

export const mockPlainTextContent = {
  title: 'Modern Web Development',
  content: 'Web development has evolved significantly with modern frameworks like React, responsive design principles, and progressive web applications.',
  url: 'https://example.com/web-dev'
};

export const mockRSSContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>NLWeb Blog</title>
    <description>Latest updates about NLWeb and AI</description>
    <link>https://nlweb.example.com/blog</link>
    <item>
      <title>Introducing NLWeb 2.0</title>
      <description>NLWeb transforms traditional websites into conversational interfaces.</description>
      <link>https://nlweb.example.com/blog/nlweb-2</link>
      <pubDate>2024-01-15T10:00:00Z</pubDate>
    </item>
  </channel>
</rss>`;

export const mockNLWebQuery = {
  question: 'What is artificial intelligence development?',
  context: 'I want to learn about AI and machine learning',
  maxResults: 3
};

export const mockMCPRequest = {
  method: 'ask',
  params: {
    question: 'Tell me about NLWeb',
    maxResults: 2
  }
};

export const mockMCPHealthRequest = {
  method: 'health',
  params: {}
};

export const mockMCPIngestRequest = {
  method: 'ingest',
  params: {
    content: JSON.stringify(mockSchemaOrgContent),
    metadata: {
      type: 'schema-org',
      source: 'test-fixture'
    }
  }
};

// Expected response structures for testing
export const expectedNLWebResponse = {
  answer: expect.any(String),
  sources: expect.arrayContaining([
    expect.objectContaining({
      title: expect.any(String),
      url: expect.any(String),
      snippet: expect.any(String),
      relevanceScore: expect.any(Number)
    })
  ]),
  metadata: expect.objectContaining({
    query: expect.any(String),
    processingTime: expect.any(Number),
    totalSources: expect.any(Number)
  })
};

export const expectedMCPResponse = {
  result: expect.any(Object)
};

export const expectedMCPErrorResponse = {
  error: expect.any(String)
};
