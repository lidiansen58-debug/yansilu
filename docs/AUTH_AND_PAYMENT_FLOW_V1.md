# Auth And Payment Flow V1

## Goal

Define the first usable registration, login, checkout, and billing flow for Yansilu.

This document is for:

- product alignment
- page design
- frontend implementation
- backend API planning

## 1. Flow Overview

The first conversion chain should be:

1. visitor lands on marketing site
2. visitor clicks `免费开始` or `升级到 Pro`
3. visitor registers or logs in
4. user enters app or pricing flow
5. user starts checkout
6. payment succeeds
7. billing state updates

## 2. Core Principles

- registration should be low-friction
- login should be fast for returning users
- checkout should use a hosted Stripe flow first
- billing status should be clear and readable
- product language should remain aligned with authorship and trust

## 3. Registration Flow

### 3.1 Entry Points

Users can reach registration from:

- homepage hero CTA
- homepage final CTA
- pricing page CTA
- login page fallback link

### 3.2 First Version Method

Use email-based registration:

- email input
- one-time verification code or magic link

### 3.3 Registration Steps

1. user clicks `免费开始`
2. user opens register page
3. user enters email
4. system sends verification code or magic link
5. user verifies
6. account is created
7. user lands in onboarding or app entry page

### 3.4 Register Page Copy

Title:

`开始建立你的思考工作流`

Body:

`创建账号后，你可以把资料、笔记、观点与写作结构连接起来，逐步形成属于自己的长期积累。`

Primary CTA:

`继续`

Secondary link:

`已经有账号？立即登录`

Trust note:

`我们更关心你的长期积累，而不是把你困在一次性的生成结果里。`

### 3.5 Register Page Elements

- title
- short benefit statement
- email input
- continue button
- login link
- error state
- resend state

## 4. Login Flow

### 4.1 Entry Points

Users can reach login from:

- top navigation
- homepage final CTA
- register page fallback link
- checkout pre-auth gate

### 4.2 Login Steps

1. user clicks `登录`
2. user opens login page
3. user enters email
4. system sends code or magic link
5. user verifies
6. user lands in app, pricing, or billing context

### 4.3 Login Page Copy

Title:

`登录并继续你的积累`

Body:

`回到你的资料、笔记与写作结构，不必每次都从头开始。`

Primary CTA:

`继续`

Secondary link:

`还没有账号？免费开始`

### 4.4 Login Page Elements

- title
- email input
- continue button
- register link
- resend code state
- invalid code state

## 5. Auth States

The frontend should support these auth states:

- logged out
- email submitted
- code sent
- verifying
- authenticated
- expired code
- invalid code
- network error

## 6. Upgrade Entry Flow

### 6.1 Upgrade Entry Points

Users can start upgrade from:

- pricing page
- in-app upgrade banner
- billing page

### 6.2 Upgrade Preconditions

Before checkout:

- user should be authenticated
- frontend should know current plan state

If user is not authenticated:

1. redirect to login or register
2. complete auth
3. return to pricing or upgrade intent

## 7. Checkout Flow

### 7.1 First Version Choice

Use Stripe Checkout Sessions.

Reason:

- simple hosted payment
- lower implementation risk
- strong subscription support

### 7.2 Checkout Steps

1. authenticated user clicks `升级到 Pro`
2. frontend calls backend create-checkout endpoint
3. backend creates Stripe Checkout Session
4. frontend redirects user to Stripe-hosted checkout
5. user completes or cancels payment
6. Stripe redirects user back
7. webhook updates subscription state
8. frontend shows billing result

### 7.3 Checkout States

Frontend should handle:

- loading
- redirecting
- canceled
- success pending sync
- success active
- failure

### 7.4 Checkout Page / Transition Copy

Loading line:

`正在跳转到安全支付页面…`

Cancel state title:

`支付尚未完成`

Cancel state body:

`你可以稍后继续。你的当前资料与账号不会受到影响。`

Success state title:

`升级成功`

Success state body:

`你的 Pro 权益正在生效。现在可以继续进入更完整的思想提纯与写作支持流程。`

## 8. Billing Page

### 8.1 Purpose

The billing page should help users:

- see current plan
- see billing status
- upgrade
- manage payment details
- open Stripe customer portal if enabled

### 8.2 Billing Page Copy

Title:

`账户与订阅`

Current plan label:

`当前方案`

Billing status label:

`订阅状态`

Renewal label:

`下次续费时间`

Primary CTA:

`管理订阅`

Secondary CTA:

`升级到 Pro`

### 8.3 Billing States

Expected states:

- free
- pro active
- pro past_due
- pro canceled
- pro incomplete

## 9. Suggested Pages

The first version should include these pages or states:

1. `/register`
2. `/login`
3. `/pricing`
4. `/checkout/success`
5. `/checkout/cancel`
6. `/account/billing`

## 10. Suggested API Surface

First version endpoints:

- `POST /auth/start`
- `POST /auth/verify`
- `POST /auth/logout`
- `GET /me`
- `POST /billing/checkout-session`
- `GET /billing/status`
- `POST /billing/customer-portal`
- `POST /billing/webhook/stripe`

## 11. Frontend Data Needed

Frontend should be able to read:

- current auth state
- current user email
- current plan
- current billing status
- checkout return result

## 12. Tracking Events

Recommended events:

- register_view
- register_submit
- register_success
- login_view
- login_submit
- login_success
- pricing_upgrade_click
- checkout_redirect
- checkout_success
- checkout_cancel

## 13. Risks To Avoid

- adding too much friction before first registration
- forcing pricing before users understand the product
- making payment feel disconnected from the product promise
- using generic AI SaaS copy that weakens trust

## 14. Recommended Build Order

1. register page
2. login page
3. auth backend flow
4. pricing upgrade action
5. checkout creation and return pages
6. webhook sync
7. billing page
