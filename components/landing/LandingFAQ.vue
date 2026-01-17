<script setup lang="ts">
const expandedFaq = ref<number | null>(null)

function toggleFaq(index: number) {
  expandedFaq.value = expandedFaq.value === index ? null : index
}

const faqItems = [
  {
    question: "When does the program start?",
    answer: "Founding members get access in April 2026. You'll be first to know when it's ready."
  },
  {
    question: "What if the product never launches?",
    answer: "If we haven't launched by Summer 2026, you get an automatic full refund. But we're committed—founding members are why we're building this."
  },
  {
    question: "What if it doesn't work for me?",
    answer: "Full refund within 30 days of starting. No questions, no hassle."
  },
  {
    question: "Can I do this while still vaping?",
    answer: "Yes—we encourage it. This isn't about forcing yourself to stop. You'll naturally stop once the illusions dissolve. Most people have their last vape as part of the program, not before it."
  },
  {
    question: "Do I need to set aside a lot of time?",
    answer: "Each session is about 10-15 minutes. Check-ins are 2-3 minutes. You can do this during a lunch break or after the kids are in bed."
  },
  {
    question: "What happens after the program?",
    answer: "You'll get check-ins at 30, 60, and 90 days to make sure the shift is sticking. And you can always come back if you need a refresher."
  }
]
</script>

<template>
  <section class="section faq-section fade-in">
    <div class="container content-container">
      <h2 class="section-title">Questions you might have</h2>

      <div class="faq-list">
        <div
          v-for="(item, index) in faqItems"
          :key="index"
          class="faq-item"
          :class="{ 'expanded': expandedFaq === index }"
        >
          <button class="faq-question" @click="toggleFaq(index)">
            <span>{{ item.question }}</span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="faq-icon"
            >
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
          <div class="faq-answer">
            <p>{{ item.answer }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
