const { handleAdvisorChat } = require('./.next/server/app/api/advisor/recommend/route.js');

async function run() {
  const res = await handleAdvisorChat({
    lead: { name: 'John', email: 'test@example.com', phone: '123' },
    question: 'quote for pipe cutting'
  });
  console.log('Intent:', res.intent);
  console.log('Product:', res.recommendedCategory);
  console.log('Quotation:', res.quotationReference);
  console.log('Answer:', res.answer);
}
run().catch(console.error);
