/**
 * Platform Fetchers
 *
 * Fetches recent posts (with engagement metrics) from connected platform APIs.
 * When real API access is unavailable, generates realistic simulated posts
 * for development and demo flows.
 */

import type { Platform, FetchedPost } from "@/lib/types";
import type { PlatformConnection } from "@/lib/platforms/store";

// ---------------------------------------------------------------------------
// Real API stubs (per-platform)
// ---------------------------------------------------------------------------

async function fetchFromInstagram(
  _connection: PlatformConnection,
  _limit: number
): Promise<FetchedPost[] | null> {
  // Real implementation would:
  //   GET /{user-id}/media?fields=caption,timestamp,like_count,comments_count,media_type
  //   GET /{media-id}/insights for reach/impressions/saves
  return null;
}

async function fetchFromFacebook(
  _connection: PlatformConnection,
  _limit: number
): Promise<FetchedPost[] | null> {
  // Real implementation would:
  //   GET /{page-id}/posts?fields=message,created_time,likes.summary(true),shares,
  //        insights.metric(post_impressions,post_engaged_users)
  return null;
}

async function fetchFromLinkedIn(
  _connection: PlatformConnection,
  _limit: number
): Promise<FetchedPost[] | null> {
  // Real implementation would:
  //   GET /ugcPosts + GET /organizationalEntityShareStatistics
  //   Note: LinkedIn's read API is restrictive
  return null;
}

async function fetchFromX(
  _connection: PlatformConnection,
  _limit: number
): Promise<FetchedPost[] | null> {
  // Real implementation would:
  //   GET /users/{id}/tweets?tweet.fields=public_metrics,created_at,text
  //   Note: requires paid API tier for meaningful read access
  return null;
}

async function fetchFromGBP(
  _connection: PlatformConnection,
  _limit: number
): Promise<FetchedPost[] | null> {
  // Real implementation would:
  //   GET /accounts/{id}/locations/{id}/localPosts + localPostMetrics
  return null;
}

const platformFetchers: Record<
  Platform,
  (conn: PlatformConnection, limit: number) => Promise<FetchedPost[] | null>
> = {
  instagram: fetchFromInstagram,
  facebook: fetchFromFacebook,
  linkedin: fetchFromLinkedIn,
  x: fetchFromX,
  gbp: fetchFromGBP,
};

// ---------------------------------------------------------------------------
// Simulated post generation
// ---------------------------------------------------------------------------

const PLATFORM_RANGES: Record<
  Platform,
  {
    impressions: [number, number];
    reachRatio: [number, number];
    likeRate: [number, number];
    commentRate: [number, number];
    shareRate: [number, number];
    saveRate: [number, number];
    clickRate: [number, number];
  }
> = {
  instagram: {
    impressions: [500, 8000],
    reachRatio: [0.6, 0.85],
    likeRate: [0.03, 0.08],
    commentRate: [0.005, 0.02],
    shareRate: [0.002, 0.015],
    saveRate: [0.01, 0.04],
    clickRate: [0.005, 0.015],
  },
  facebook: {
    impressions: [300, 5000],
    reachRatio: [0.5, 0.75],
    likeRate: [0.02, 0.06],
    commentRate: [0.003, 0.015],
    shareRate: [0.005, 0.025],
    saveRate: [0.001, 0.005],
    clickRate: [0.008, 0.02],
  },
  linkedin: {
    impressions: [200, 4000],
    reachRatio: [0.7, 0.9],
    likeRate: [0.02, 0.05],
    commentRate: [0.005, 0.02],
    shareRate: [0.003, 0.015],
    saveRate: [0.002, 0.008],
    clickRate: [0.01, 0.03],
  },
  x: {
    impressions: [400, 10000],
    reachRatio: [0.4, 0.7],
    likeRate: [0.01, 0.04],
    commentRate: [0.002, 0.01],
    shareRate: [0.005, 0.03],
    saveRate: [0.001, 0.005],
    clickRate: [0.005, 0.015],
  },
  gbp: {
    impressions: [100, 2000],
    reachRatio: [0.8, 0.95],
    likeRate: [0.01, 0.03],
    commentRate: [0.002, 0.008],
    shareRate: [0.001, 0.005],
    saveRate: [0.001, 0.003],
    clickRate: [0.02, 0.05],
  },
};

const CONTENT_TEMPLATES: Record<Platform, { types: string[]; captions: string[] }> = {
  instagram: {
    types: ["image", "carousel", "reel", "story"],
    captions: [
      "Excited to share our latest product launch! Check out the new features we've been working on. #innovation #launch",
      "Behind the scenes at our office today. The team is hard at work on something special! #teamwork #behindthescenes",
      "5 tips to boost your productivity this week. Save this post for later! #productivity #tips",
      "Customer spotlight: See how @example transformed their workflow with our solution. #casestudy #success",
      "Happy Monday! Starting the week with a fresh perspective on industry trends. #mondaymotivation",
      "New blog post alert! We break down the top trends shaping our industry in 2024. Link in bio. #trends",
      "Thank you for 10K followers! Your support means everything to us. #milestone #grateful",
      "Quick tutorial: How to get started in just 3 easy steps. Swipe to learn more! #tutorial #howto",
      "Our CEO shares thoughts on the future of the industry at yesterday's conference. #leadership #conference",
      "Weekend vibes! The team recharging for another productive week ahead. #weekend #teamculture",
    ],
  },
  facebook: {
    types: ["image", "video", "text-only", "carousel"],
    captions: [
      "We're thrilled to announce our newest feature! This has been months in the making and we can't wait for you to try it.",
      "Did you know? 73% of businesses see improved results after implementing our solution. Read the full report on our blog.",
      "Join us for a free webinar next Thursday! We'll be covering the latest strategies for growth. Register now!",
      "A big congratulations to our team for winning the Innovation Award this year. We're honored!",
      "Looking for tips? Here are 7 ways to optimize your daily workflow and save time.",
      "Customer story: How a small business grew their revenue by 40% in just 6 months. Full story below.",
      "We're hiring! Check out our open positions and join our growing team. Link in comments.",
      "Industry update: Here's what you need to know about the latest changes affecting your business.",
      "Throwback to our company retreat last month. Team bonding at its finest!",
      "Poll time! What's your biggest challenge right now? Drop your answer in the comments.",
    ],
  },
  linkedin: {
    types: ["text-only", "image", "carousel", "video"],
    captions: [
      "Reflecting on a key lesson from this quarter: the importance of customer feedback in product development. Here's what we learned...",
      "Excited to share that we've been named a Top Workplace for 2024. This recognition reflects our commitment to our team.",
      "3 trends every leader should watch in 2024:\n1. AI-driven decision making\n2. Remote work evolution\n3. Sustainability focus",
      "Just published: Our comprehensive guide to scaling operations efficiently. Thoughts welcome in the comments.",
      "Proud to welcome 5 new team members this month! Growing our engineering and design capabilities.",
      "The key to successful digital transformation isn't technology — it's people. Here's our approach.",
      "Attended an insightful panel on the future of our industry. Key takeaway: adaptability is everything.",
      "We believe in transparency. Here's our Q3 update and what's ahead for Q4.",
      "Great leaders invest in their teams. Here are 4 ways we're supporting professional development.",
      "Partnership announcement: We're teaming up with a leading firm to deliver even better solutions.",
    ],
  },
  x: {
    types: ["text-only", "image", "thread"],
    captions: [
      "Just shipped a major update! Here's what's new 🧵",
      "Hot take: The future of our industry isn't about more tools, it's about better workflows.",
      "TIL: A simple process change can save teams 10+ hours per week. Here's how we did it.",
      "Big news dropping tomorrow. Stay tuned! 👀",
      "Replying to our community: Thank you for the feedback! We've already started working on it.",
      "5 things I wish I knew when starting out in this industry. A thread 🧵",
      "Our latest blog post breaks down the data behind successful strategies. Link below.",
      "Shoutout to our amazing community for hitting 50K! You all make this possible.",
      "Quick tip: Don't overlook this simple setting that can dramatically improve your results.",
      "Monday motivation: Ship fast, learn faster. What are you building this week?",
    ],
  },
  gbp: {
    types: ["text-only", "image"],
    captions: [
      "We're open for business! Visit us this weekend for exclusive in-store promotions.",
      "New hours update: We're now open until 8pm on weekdays to better serve you.",
      "Special offer: 20% off all services this month. Book your appointment today!",
      "Thank you for your wonderful reviews! We're committed to providing the best experience.",
      "Seasonal update: Check out our new menu items available starting this week.",
      "Community event: Join us this Saturday for our annual open house. Everyone is welcome!",
      "We've just renovated our space! Come see the new look and enjoy a special welcome offer.",
      "Holiday hours: We'll be closed Dec 25-26 and open regular hours otherwise.",
    ],
  },
};

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.round(rand(min, max));
}

function randomDate(daysBack: number): string {
  const now = Date.now();
  const offset = Math.random() * daysBack * 24 * 60 * 60 * 1000;
  return new Date(now - offset).toISOString();
}

function simulatePosts(platform: Platform, count: number): FetchedPost[] {
  const ranges = PLATFORM_RANGES[platform];
  const templates = CONTENT_TEMPLATES[platform];
  const posts: FetchedPost[] = [];

  for (let i = 0; i < count; i++) {
    const impressions = randInt(...ranges.impressions);
    const reach = Math.round(impressions * rand(...ranges.reachRatio));
    const likes = Math.round(impressions * rand(...ranges.likeRate));
    const comments = Math.round(impressions * rand(...ranges.commentRate));
    const shares = Math.round(impressions * rand(...ranges.shareRate));
    const saves = Math.round(impressions * rand(...ranges.saveRate));
    const clicks = Math.round(impressions * rand(...ranges.clickRate));
    const totalEngagements = likes + comments + shares + saves + clicks;
    const engagementRate =
      impressions > 0
        ? Math.round((totalEngagements / impressions) * 10000) / 10000
        : 0;

    posts.push({
      platformPostId: `sim_${platform}_${Date.now()}_${i}`,
      platform,
      content: templates.captions[i % templates.captions.length],
      mediaType: templates.types[i % templates.types.length],
      postedAt: randomDate(60),
      impressions,
      reach,
      likes,
      comments,
      shares,
      saves,
      clicks,
      engagementRate,
    });
  }

  return posts.sort(
    (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
  );
}

// ---------------------------------------------------------------------------
// Main fetch function
// ---------------------------------------------------------------------------

export async function fetchRecentPosts(
  connection: PlatformConnection,
  limit: number = 30
): Promise<FetchedPost[]> {
  const fetcher = platformFetchers[connection.platform];

  const realPosts = await fetcher(connection, limit);
  if (realPosts && realPosts.length > 0) {
    return realPosts;
  }

  return simulatePosts(connection.platform, Math.min(limit, 30));
}
