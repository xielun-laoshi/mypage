## A bot that won tables and went out first

I got to compete in the Boston regional of [No Limit: A Bot Building Tournament, hosted by Sequoia Capital, Citadel Securities, and OpenAI](https://pokerbot.sequoiacap.com/). Roughly 200 teams were selected from a reported pool of more than 5,000 applicants, and I was one of them. (It's for university students and recent graduates, in teams of one or two. I entered alone.)

The format is a sprint. Nobody knows which poker variant will be played until the organizers reveal it, and then every team has one hour to build a bot. Six scored rounds follow, one every 20 minutes, with practice rounds in between. In each scored round the bots face off at thousands of eight-seat tables (every bot plays one table per iteration, for up to 100,000 iterations). A table pays 50, 30 and 20 points to first, second and third place and nothing to the other five, so an average bot scores 12.5 points a table.

My bot, *durrrr*, placed 75th out of 231 entries. On paper that's the top third. But only 194 of those entries had a bot running, and among the bots that actually played, 75th is closer to the top 40%. (Five teams from each of three regionals, the Bay Area, Boston and Pittsburgh, plus five wildcards, went on to a final in San Francisco, with a $100K grand prize and a different variant.)

The hand histories show something odd about how durrrr got there. Call the ten best-scoring bots it met "the top ten" (scored over the tables they shared) and every other bot "the field". durrrr won its table more often than 92% of the field. It also finished dead last more often than 92% of the field. Same bot.

<figure class="nl-chart">
<link rel="stylesheet" href="charts.css" />
<div class="nl-multiples">
<div class="nl-panel">
<span class="nl-title nl-label is-ink">durrrr</span>
<div class="nl-cols" style="--max:30" role="img" aria-label="durrrr: 1st 20.7%, 2nd 8.8%, 3rd 7.7%, 4th 7.6%, 5th 9.3%, 6th 12.0%, 7th 15.0%, 8th 18.9%"><span class="nl-gl" style="--v:10"><span>10%</span></span><span class="nl-gl" style="--v:20"><span>20%</span></span><span class="nl-gl" style="--v:30"><span>30%</span></span><span class="nl-col nl-tip nl-us" style="--v:20.7" data-tip="20.7% · durrrr, 1st"><span class="nl-v">20.7</span></span><span class="nl-col nl-tip nl-us" style="--v:8.8" data-tip="8.8% · durrrr, 2nd"></span><span class="nl-col nl-tip nl-us" style="--v:7.7" data-tip="7.7% · durrrr, 3rd"></span><span class="nl-col nl-tip nl-us" style="--v:7.6" data-tip="7.6% · durrrr, 4th"></span><span class="nl-col nl-tip nl-us" style="--v:9.3" data-tip="9.3% · durrrr, 5th"></span><span class="nl-col nl-tip nl-us" style="--v:12.0" data-tip="12.0% · durrrr, 6th"></span><span class="nl-col nl-tip nl-us" style="--v:15.0" data-tip="15.0% · durrrr, 7th"></span><span class="nl-col nl-tip nl-us" style="--v:18.9" data-tip="18.9% · durrrr, 8th"><span class="nl-v">18.9</span></span></div>
<div class="nl-places nl-label" aria-hidden="true"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span></div>
</div>
<div class="nl-panel">
<span class="nl-title nl-label">Top ten</span>
<div class="nl-cols" style="--max:30" role="img" aria-label="Top ten: 1st 25.1%, 2nd 15.0%, 3rd 12.3%, 4th 9.4%, 5th 10.0%, 6th 10.1%, 7th 9.7%, 8th 8.4%"><span class="nl-gl" style="--v:10"><span>10%</span></span><span class="nl-gl" style="--v:20"><span>20%</span></span><span class="nl-gl" style="--v:30"><span>30%</span></span><span class="nl-col nl-tip nl-top" style="--v:25.1" data-tip="25.1% · Top ten, 1st"><span class="nl-v">25.1</span></span><span class="nl-col nl-tip nl-top" style="--v:15.0" data-tip="15.0% · Top ten, 2nd"></span><span class="nl-col nl-tip nl-top" style="--v:12.3" data-tip="12.3% · Top ten, 3rd"></span><span class="nl-col nl-tip nl-top" style="--v:9.4" data-tip="9.4% · Top ten, 4th"></span><span class="nl-col nl-tip nl-top" style="--v:10.0" data-tip="10.0% · Top ten, 5th"></span><span class="nl-col nl-tip nl-top" style="--v:10.1" data-tip="10.1% · Top ten, 6th"></span><span class="nl-col nl-tip nl-top" style="--v:9.7" data-tip="9.7% · Top ten, 7th"></span><span class="nl-col nl-tip nl-top" style="--v:8.4" data-tip="8.4% · Top ten, 8th"><span class="nl-v">8.4</span></span></div>
<div class="nl-places nl-label" aria-hidden="true"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span></div>
</div>
<div class="nl-panel">
<span class="nl-title nl-label">Field</span>
<div class="nl-cols" style="--max:30" role="img" aria-label="Field: 1st 11.3%, 2nd 13.0%, 3rd 13.2%, 4th 13.2%, 5th 13.0%, 6th 12.6%, 7th 12.2%, 8th 11.6%"><span class="nl-gl" style="--v:10"><span>10%</span></span><span class="nl-gl" style="--v:20"><span>20%</span></span><span class="nl-gl" style="--v:30"><span>30%</span></span><span class="nl-col nl-tip nl-field" style="--v:11.3" data-tip="11.3% · Field, 1st"><span class="nl-v">11.3</span></span><span class="nl-col nl-tip nl-field" style="--v:13.0" data-tip="13.0% · Field, 2nd"></span><span class="nl-col nl-tip nl-field" style="--v:13.2" data-tip="13.2% · Field, 3rd"></span><span class="nl-col nl-tip nl-field" style="--v:13.2" data-tip="13.2% · Field, 4th"></span><span class="nl-col nl-tip nl-field" style="--v:13.0" data-tip="13.0% · Field, 5th"></span><span class="nl-col nl-tip nl-field" style="--v:12.6" data-tip="12.6% · Field, 6th"></span><span class="nl-col nl-tip nl-field" style="--v:12.2" data-tip="12.2% · Field, 7th"></span><span class="nl-col nl-tip nl-field" style="--v:11.6" data-tip="11.6% · Field, 8th"><span class="nl-v">11.6</span></span></div>
<div class="nl-places nl-label" aria-hidden="true"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span></div>
</div>
</div>
<p class="nl-axis-title nl-label" aria-hidden="true">Finishing place</p>
<details class="nl-data"><summary>Numbers</summary>
<div class="table"><table>
<thead><tr><th>Place</th><th style="text-align:right">durrrr</th><th style="text-align:right">Top ten</th><th style="text-align:right">Field</th></tr></thead>
<tbody>
<tr><td>1st</td><td style="text-align:right">20.7%</td><td style="text-align:right">25.1%</td><td style="text-align:right">11.3%</td></tr>
<tr><td>2nd</td><td style="text-align:right">8.8%</td><td style="text-align:right">15.0%</td><td style="text-align:right">13.0%</td></tr>
<tr><td>3rd</td><td style="text-align:right">7.7%</td><td style="text-align:right">12.3%</td><td style="text-align:right">13.2%</td></tr>
<tr><td>4th</td><td style="text-align:right">7.6%</td><td style="text-align:right">9.4%</td><td style="text-align:right">13.2%</td></tr>
<tr><td>5th</td><td style="text-align:right">9.3%</td><td style="text-align:right">10.0%</td><td style="text-align:right">13.0%</td></tr>
<tr><td>6th</td><td style="text-align:right">12.0%</td><td style="text-align:right">10.1%</td><td style="text-align:right">12.6%</td></tr>
<tr><td>7th</td><td style="text-align:right">15.0%</td><td style="text-align:right">9.7%</td><td style="text-align:right">12.2%</td></tr>
<tr><td>8th</td><td style="text-align:right">18.9%</td><td style="text-align:right">8.4%</td><td style="text-align:right">11.6%</td></tr>
</tbody></table></div>
</details>
<figcaption>How often each finished in each place, as a share of its tables. durrrr won four tables for every five the top ten won, and finished last more than twice as often.</figcaption>
</figure>

How does one bot do both? I went back through the hand histories to find out what caused my result and what I'd change next time: roughly 10,000 tables per scored round, 60,018 tables and 8.1 million hands in all.

The short answer is one assumption. I expected a strong field playing balanced strategies (roughly: opponents who bluff exactly as often as the math says they should), so I built durrrr to be hard to exploit. The real field bluffed far less and folded far more than a balanced strategy would. Across all six rounds, that misread cost more than anything else: durrrr called bets it could have folded to, and passed up bluffs the field would likely have let through.

The rest of this post follows that assumption: where it came from, what I worked on during the contest while it sat unchecked, and what the logs say it cost. There's also one hand, the very first hand of a table in the last round, that shows the whole problem at once.

## Before the contest, I planned for a balanced field

The variant stays secret until the hour starts, but I wasn't starting from nothing. I knew the table format, the scoring and the engine's limits ahead of time, and I expected the variant to be built on no-limit hold'em.

If you haven't played hold'em, here's everything this post needs. Each player gets two private cards. Five shared cards then arrive in three steps: three at once (the *flop*), then one (the *turn*), then one more (the *river*). There's a round of betting before the flop and after each step, and each round is called a *street*. On your turn you can fold, call (match the bet), raise, or, if nobody has bet, check. Two players post forced bets called *blinds* before each deal, and stacks are counted in big blinds: 2,000 chips with a big blind of 20 is 100 bb. The best five-card hand out of your two cards and the shared five wins the pot at *showdown*, unless everyone else folds first. "No-limit" means a bet can be any size, up to everything you have: all-in.

And these are the tournament's own rules, as they stood in Boston:

| Rule | Boston |
|---|---|
| A table | 8 bots, 2,000 chips each, blinds 10/20 rising every 20 hands, no antes |
| Its end | One bot holds every chip, or 250 hands have been played (the survivors then split the points by their stacks) |
| Points | 50, 30 and 20 for 1st, 2nd and 3rd; nothing for 4th to 8th |
| A round's score | Average points per table; an average bot scores 12.5 |
| The final score | The six rounds weighted 1, 2, 3, 5, 8 and 13, so the last counts thirteen times the first |
| Time to act | 1 ms per decision; a bot that runs out of time checks if it can, and folds if not |
| Memory | Empty at the start of every table, and seats are anonymous: nothing carries over from one table to the next |

### Why the defaults matter so much

Three of those rules shaped the bot more than the rest: a millisecond per decision, no memory across tables, and anonymous seats.

The millisecond is why durrrr's decisions are mostly table lookups. The other two mean it can never recognize an opponent it has met before. It can learn about the seven others at its table only within the 130 or so hands a table lasts, and about the field as a whole only through the defaults it is built with.

So the defaults are where my assumptions live. Whatever I believed about the field before the contest, durrrr would believe again at the start of every table.

### What "balanced" means, in one bet

I expected a strong field playing balanced strategies. That word needs unpacking, and one bet is enough to do it.

Say the pot is 100 chips and my opponent bets 75. Calling risks 75 to win 175 (the pot plus their bet), so it breaks even if I win 75 times out of 250: 30%. That 30% is the *price* of the call.

Now suppose my opponent is bluffing exactly 30% of the times they make that bet, and has me beaten the other 70%. Then my call wins exactly as often as its price, and I make nothing by calling and nothing by folding. That's a *balanced* bettor: bluffs and real hands mixed in the one proportion that leaves me nothing to take advantage of.

It works the other way too. A bluff of 75 into a pot of 100 risks 75 to win 100, so it profits if I fold more than 75 times out of 175: 43%. A balanced defender folds no more often than that.

A strategy that no opponent can beat is an equilibrium (poker players say GTO, for game-theory optimal), and it has to be balanced in both ways. *Exploiting* is what you do to opponents who aren't: fold more against players who rarely bluff, bluff more against players who fold too much.

Against a truly balanced field there is nothing to exploit, so the best a bot can do is not be exploitable itself. That was the plan: make durrrr hard to exploit. I could commit to it before I knew the variant, because none of it depends on the variant.

### The bot I brought

By the time the variant was announced, durrrr already played ordinary no-limit hold'em. Everything in this section was written before the contest.

It's one Python file that uses only the standard library. Within its millisecond, a decision is a handful of table lookups and, after the flop, one exact count of the opposing hands it beats; the tables are built when it starts, before the host copies it to play many tables at once. What it knows about a table travels between decisions in a small block of memory, mostly 16 counters for each opponent (how often they open, re-raise, call a raise, bet when checked to, fold to a bet), each counted against the chances they had and each starting from a default.

- **Before the flop** it *opens* (makes the first raise) with more hands the fewer players are left behind it: 12% from the first seat, 28% from the cutoff and 40% from the button (the last two seats before the blinds), 45% from the small blind, and 80% heads-up, with two players left. Facing a raise, it re-raises with the top quarter of the hands it thinks the raiser holds, calls when its equity against that range, discounted for position, beats the price, and folds the rest. (A *range* is the set of hands a player might hold. *Equity* is a hand's average share of the pot if the remaining cards were dealt out.)
- **With 15 big blinds or less** it only moves all-in or folds, by the chips it expects to win, counting the chance that everyone behind folds.
- **All-in calls** are judged in tournament points, with ICM: the standard model that turns a set of stacks into each player's share of the prizes.
- **After the flop**, hand strength is exact: the share of the two-card hands an opponent could hold that durrrr's hand beats right now (1.0 is the nuts, the best possible hand). It bets strong hands for 3/4 of the pot, good ones for 1/2, and some draws. Facing a bet, it calls when its equity against a model of the bettor's range, some value hands and some bluffs, beats the price.

How many bluffs does that model put in a bettor's range? The balanced share:

```python
bluffs = min(0.6, price + EXTRA_BLUFF_SHARE[street - 1]) * min(1.0, aggression / PRIOR_AGGRESSION)
value_hands = aggression * (1 - bluffs)
```

`price` is the number from the example above: on the river the assumed share of bluffs is exactly that, with a little more on the flop and the turn. (The last factor lowers it for an opponent who bets less often than the default.) Against a bet of 3/4 of the pot, it comes to about 30% bluffs.

Those two lines are the assumption this post is about. There are other defaults too: until durrrr has seen otherwise, an opponent folds to 50% of bets, re-raises a raise 7% of the time, and calls all-ins at equilibrium widths. Further down, each default gets put next to what the field actually did.

### What I could work out ahead of time

Some parts of hold'em are small enough to work out exactly in advance, and for those I didn't have to guess at anyone's habits. Two lookup tables, computed offline and shipped as JSON beside the bot, sit behind the play before the flop.

The **preflop table** has a row for each of the 169 distinct starting hands (the 13 pairs, and every suited and offsuit pair of ranks), holding a percentile and nine equities. The percentile ranks each hand by its equity against a random hand, counting each by its number of card combinations. The equities are against nine ranges, from every hand down to the top 5%, each estimated by dealing random boards against hands drawn from the range. Pocket aces win 85.1% against a random hand and still 82.5% against the top 5%; three-two offsuit wins 32.5%.

The **push/fold table** answers the short-stack question: at a given depth, which hands should move all-in, and which should call? Heads-up it is a small two-player game, and I solved it with CFR+, a form of counterfactual regret minimization. The small blind can shove (move all-in) or fold, the big blind can call or fold, and on every pass each side shifts its weight toward the actions it most regrets not having taken:

```python
for t in range(1, iterations + 1):
    c, p = regret_match(rc, rk), regret_match(rp, rf)
    push_value = big_blind_posted * (J @ (1 - c)) + called @ c
    node = p * push_value + (1 - p) * fold_value
    rp, rf = np.maximum(rp + push_value - node, 0), np.maximum(rf + fold_value - node, 0)
    # ... and the same for the big blind's call or fold
```

`J` weights each pair of hand classes by how often they are dealt together, card removal counted exactly, and `called` is what the small blind makes when called. Four hundred passes at each depth from 1 to 25 big blinds leave strategies that the best possible opponent could exploit by at most 0.00002 big blinds a hand: for this purpose, the equilibrium. Heads-up, the small blind shoves 73% of hands at 5 big blinds, 58% at 10 and 36% at 25.

With more players behind there is no clean solution, so the table extends the heads-up answer by fictitious play: each player still to act calls when its equity against the shoving range beats a big blind's price, the shover answers those callers as well as it can, and the running averages of both are iterated until they settle. With seven players behind, the first to act shoves 34% of hands at 5 big blinds and 4% at 25. When the bot starts, it derives two more tables from these: the share of any range that can call profitably at any price, and how wide an equilibrium all-in over a raise is.

That 0.00002 is what "hard to exploit" looks like when a problem is small enough to solve. The rest of the game is far too big for that, so everywhere else durrrr rests on the defaults above.

What I couldn't prepare was the variant itself.

## On the day, my hour went to the auction

The announcement: no-limit hold'em, with one change. The flop is bought at a sealed auction.

Every bot starts each table with 1,000 *flop-chips*. They are good only for bidding, never topped up, and worth nothing when the table ends. After the betting before the flop, if two or more players are left, five cards are dealt face up, and every player still in the hand, all-ins included, splits a secret bid across them. The three cards with the most chips on them become the flop; the other two are dead for the hand. You pay only what you bid on the three chosen cards, and those chips are gone, whoever wins the pot.

Two things follow. Putting a card on the flop is cheap, but keeping one off is expensive: there are no negative bids, so the only way to stop a card is to outbid it on three others. And since bids are hidden but balances are public, every auction tells the table one number about each player: what they just paid for this flop. (There were side prizes, too, from the biggest spender at auction to the most knockouts.)

I'd guessed right about the base game, so most of the bot I'd brought carried over. What it couldn't do was bid, which is a problem when the flop is sold at auction. That's where the hour went.

The bid has to fit in the same millisecond as every other decision. It scores all ten possible flops (there are ten ways to choose three cards out of five), bids only on the cards of the one it wants, and spends in proportion to what is at stake in this pot against what is likely to be at stake later, capped by what each opponent has been paying. It never tries to keep a card off the flop: that means outbidding it three times over.

### Between rounds, I tuned the auction

You can keep uploading between rounds, since each one freezes whichever bot you have active when it starts. The bot that played the last round was my eighth version. Most of the changes were to the auction, and each came from something I had measured:

- **Flops kept getting more expensive.** In pots with betting still to come, the field's average payment was 24.6 flop-chips, then 30.8, 37.5 and 38.1 over the rounds I measured. durrrr caps its bids by what opponents are likely to pay, and its default for an opponent it hasn't watched yet went from 20 to 38.
- **Flop-chips win all-ins.** With a player all-in before the flop, the auction is the last decision in the hand. Over 867 of the field's all-ins, a player who still had flop-chips beat one who had none by about ten points of win probability, so durrrr counts that edge. Replaying 3,021 heads-up all-ins with both hands known showed it should spend more when the auction is the last decision left.
- **A payment says something about a hand.** A hand that beats 80% of random hands beats 87% of what a bot holds after paying nothing for the flop, and only 63% of what it holds after paying four times its usual. durrrr reads payments that way.
- **Opponents who paid nothing fold a lot.** They folded to durrrr's flop bets 57% of the time in one round, then 66% in a later one (3,471 bets), and a bet of 0.4 of the pot needs only 29% folds to pay for itself. So heads-up on the flop, against an opponent that paid nothing, durrrr started betting 0.4 of the pot with 70% of the hands it would otherwise have checked.
- **One idea went the other way.** Rules for raising after the flop, tried in the sixth version, lost 2.3 points a seat in a local test against the version before, and I switched them off.

Nearly everything on that list is about the auction: what flops cost, what flop-chips are worth, what a payment gives away. It was the new part of the game, the one part I hadn't been able to think about beforehand, and it got most of my attention.

Here's what isn't on the list. The two lines that set how often a bettor is bluffing never changed: they are identical in the file from before the contest and in the eighth version. I had even found one spot where this field folded too much, and built a bluff for it. I didn't ask the bigger version of the same question: was this field balanced at all?

## The hand histories: fewer bluffs, more folds

After the contest I went back to the downloadable hand histories to find out where the points had gone. The data is the first 10,000 tables of each scored round: 8.9 GB of JSON lines, 61,628 tables (60,018 scored for durrrr, and 1,610 where it only filled out a short table) and 8,111,936 hands. Each hand lists every seat's stack, flop-chips and tournament points before and after, every action, and the cards shown at showdown.

Three kinds of numbers are coming, and they deserve different amounts of trust:

- **Things that happened.** How often a bot folded, what a bettor turned over, where durrrr finished. These are observations, though other bots are seen only at durrrr's tables (about 360 tables per bot per round), so their numbers are estimates from a sample.
- **What a decision was worth against folding.** Every hand carries each player's tournament points before and after it, from the engine's own ICM, which durrrr's ICM function reproduces to within 0.0001. So a call can be valued exactly against what folding was worth at that moment: the pot to the bettor, every stack as it stood.
- **What a different strategy might have earned.** These are estimates, and I'll say so each time. A fold rate tells me how the field answered the bets it actually faced, not how it would have answered durrrr's. What a play earned the top ten is what was there to be made, not what durrrr would have made.

### First question: where did the points go?

| Round | Weight | Points per table | Won the table | Finished last |
|---|---|---|---|---|
| 1 | 1 | 15.98 | 24.8% | 19.9% |
| 2 | 2 | 15.17 | 22.7% | 20.4% |
| 3 | 3 | 13.21 | 18.8% | 21.3% |
| 4 | 5 | 14.01 | 19.5% | 17.7% |
| 5 | 8 | 14.92 | 20.4% | 18.2% |
| 6 | 13 | 13.86 | 17.9% | 15.9% |

Weighted, that is 455.5 points, or 14.23 a table: above the 12.5 average in every round, but the best bots durrrr met averaged 17.6 to 22.0 points a table. (The logs carry no times. I ordered the rounds by how many bots played, 192, 193, then 194, and by the field's play, which grew steadily more aggressive.)

You've seen the shape of the result already: lots of wins, lots of last places. This chart shows when the last places happened:

<figure class="nl-chart">
<div class="nl-legend nl-label"><span class="nl-key is-line nl-us">durrrr</span><span class="nl-key is-line nl-top">Top ten</span><span class="nl-key is-line nl-field">Field</span></div>
<div class="nl-lines" role="img" aria-label="Share of tables at which each was already out, by hand. By hand 20: durrrr 12.3%, top ten 4.9%, field 7.6%. By hand 40: 26.5%, 12.6% and 17.2%. By hand 100: 60.9%, 45.4% and 56.5%."><span class="nl-gl" style="--v:25"><span>25%</span></span><span class="nl-gl" style="--v:50"><span>50%</span></span><span class="nl-gl" style="--v:75"><span>75%</span></span><span class="nl-gl" style="--v:100"><span>100%</span></span>
<svg viewBox="0 0 160 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><polyline class="nl-field" points="0,100 10,96.1 20,92.4 30,87.6 40,82.8 50,76.8 60,71.8 70,64.4 80,58.4 90,50.4 100,43.5 110,34.6 120,28.5 130,21.7 140,17.6 150,14.4 160,12.9" /><polyline class="nl-top" points="0,100 10,97.6 20,95.1 30,91.1 40,87.4 50,82.2 60,77.8 70,71.7 80,66.5 90,60.2 100,54.6 110,47.2 120,41.7 130,34.9 140,30.6 150,27.3 160,26.1" /><polyline class="nl-us" points="0,100 10,93.5 20,87.7 30,80.2 40,73.5 50,66.7 60,60.9 70,54.4 80,49.3 90,43.6 100,39.1 110,33.8 120,29.8 130,25.4 140,23.1 150,21.5 160,21" /></svg>
<span class="nl-x nl-tip" style="--x:10" data-tip="By hand 10: durrrr 6.5% · top ten 2.4% · field 3.9%"></span><span class="nl-x nl-tip" style="--x:20" data-tip="By hand 20: durrrr 12.3% · top ten 4.9% · field 7.6%"></span><span class="nl-x nl-tip" style="--x:30" data-tip="By hand 30: durrrr 19.8% · top ten 8.9% · field 12.4%"></span><span class="nl-x nl-tip" style="--x:40" data-tip="By hand 40: durrrr 26.5% · top ten 12.6% · field 17.2%"></span><span class="nl-x nl-tip" style="--x:50" data-tip="By hand 50: durrrr 33.3% · top ten 17.8% · field 23.2%"></span><span class="nl-x nl-tip" style="--x:60" data-tip="By hand 60: durrrr 39.1% · top ten 22.2% · field 28.2%"></span><span class="nl-x nl-tip" style="--x:70" data-tip="By hand 70: durrrr 45.6% · top ten 28.3% · field 35.6%"></span><span class="nl-x nl-tip" style="--x:80" data-tip="By hand 80: durrrr 50.7% · top ten 33.5% · field 41.6%"></span><span class="nl-x nl-tip" style="--x:90" data-tip="By hand 90: durrrr 56.4% · top ten 39.8% · field 49.6%"></span><span class="nl-x nl-tip" style="--x:100" data-tip="By hand 100: durrrr 60.9% · top ten 45.4% · field 56.5%"></span><span class="nl-x nl-tip is-late" style="--x:110" data-tip="By hand 110: durrrr 66.2% · top ten 52.8% · field 65.4%"></span><span class="nl-x nl-tip is-late" style="--x:120" data-tip="By hand 120: durrrr 70.2% · top ten 58.3% · field 71.5%"></span><span class="nl-x nl-tip is-late" style="--x:130" data-tip="By hand 130: durrrr 74.6% · top ten 65.1% · field 78.3%"></span><span class="nl-x nl-tip is-late" style="--x:140" data-tip="By hand 140: durrrr 76.9% · top ten 69.4% · field 82.4%"></span><span class="nl-x nl-tip is-late" style="--x:150" data-tip="By hand 150: durrrr 78.5% · top ten 72.7% · field 85.6%"></span><span class="nl-x nl-tip is-late" style="--x:160" data-tip="By hand 160: durrrr 79.0% · top ten 73.9% · field 87.1%"></span></div>
<div class="nl-hands nl-label" aria-hidden="true"><span style="--x:0">0</span><span style="--x:40">40</span><span style="--x:80">80</span><span style="--x:120">120</span><span style="--x:160">160</span></div>
<p class="nl-axis-title nl-label" aria-hidden="true">Hand of the table</p>
<details class="nl-data"><summary>Numbers</summary>
<div class="table"><table>
<thead><tr><th>By hand</th><th style="text-align:right">durrrr</th><th style="text-align:right">Top ten</th><th style="text-align:right">Field</th></tr></thead>
<tbody>
<tr><td>10</td><td style="text-align:right">6.5%</td><td style="text-align:right">2.4%</td><td style="text-align:right">3.9%</td></tr>
<tr><td>20</td><td style="text-align:right">12.3%</td><td style="text-align:right">4.9%</td><td style="text-align:right">7.6%</td></tr>
<tr><td>30</td><td style="text-align:right">19.8%</td><td style="text-align:right">8.9%</td><td style="text-align:right">12.4%</td></tr>
<tr><td>40</td><td style="text-align:right">26.5%</td><td style="text-align:right">12.6%</td><td style="text-align:right">17.2%</td></tr>
<tr><td>50</td><td style="text-align:right">33.3%</td><td style="text-align:right">17.8%</td><td style="text-align:right">23.2%</td></tr>
<tr><td>60</td><td style="text-align:right">39.1%</td><td style="text-align:right">22.2%</td><td style="text-align:right">28.2%</td></tr>
<tr><td>70</td><td style="text-align:right">45.6%</td><td style="text-align:right">28.3%</td><td style="text-align:right">35.6%</td></tr>
<tr><td>80</td><td style="text-align:right">50.7%</td><td style="text-align:right">33.5%</td><td style="text-align:right">41.6%</td></tr>
<tr><td>90</td><td style="text-align:right">56.4%</td><td style="text-align:right">39.8%</td><td style="text-align:right">49.6%</td></tr>
<tr><td>100</td><td style="text-align:right">60.9%</td><td style="text-align:right">45.4%</td><td style="text-align:right">56.5%</td></tr>
<tr><td>110</td><td style="text-align:right">66.2%</td><td style="text-align:right">52.8%</td><td style="text-align:right">65.4%</td></tr>
<tr><td>120</td><td style="text-align:right">70.2%</td><td style="text-align:right">58.3%</td><td style="text-align:right">71.5%</td></tr>
<tr><td>130</td><td style="text-align:right">74.6%</td><td style="text-align:right">65.1%</td><td style="text-align:right">78.3%</td></tr>
<tr><td>140</td><td style="text-align:right">76.9%</td><td style="text-align:right">69.4%</td><td style="text-align:right">82.4%</td></tr>
<tr><td>150</td><td style="text-align:right">78.5%</td><td style="text-align:right">72.7%</td><td style="text-align:right">85.6%</td></tr>
<tr><td>160</td><td style="text-align:right">79.0%</td><td style="text-align:right">73.9%</td><td style="text-align:right">87.1%</td></tr>
</tbody></table></div>
</details>
<figcaption>The share of its tables at which each was already out, by hand. By hand 20 durrrr was out of 12% of its tables and the top ten of 5%; by hand 40, 27% and 13%. Each curve levels off at the share of tables it did not win.</figcaption>
</figure>

Early. By hand 40, durrrr was already out of more than a quarter of its tables, and the top ten of 13%.

The gap to the top ten (the ten best-scoring bots durrrr met) is 5.0 points a table, and since every hand carries tournament points before and after, it can be split exactly by where it was lost:

| Players left | 8 or 7 | 6 or 5 | 4 | 3 | 2 |
|---|---|---|---|---|---|
| durrrr behind the top ten, points a table | −2.1 | −1.8 | −0.8 | −0.2 | −0.1 |

| durrrr's stack | 50 bb or more | 25 to 50 bb | 15 to 25 bb | 8 to 15 bb | Under 8 bb |
|---|---|---|---|---|---|
| durrrr behind the top ten, points a table | −2.2 | −1.9 | −0.7 | −0.2 | −0.1 |

Four fifths of it went with five or more players at the table, and four fifths with 25 big blinds or more: deep, full-table poker. Short-handed and short-stacked, where the solved tables take over, durrrr was nearly as good as the best, and it won 70% of the heads-up matches it reached.

So the part I'd solved was fine. The points went at the start of tables, with nearly everyone still in and plenty of chips behind. What was durrrr doing there that the best bots weren't?

### The scoreboard: what durrrr assumed, and what the field did

durrrr's defaults, the ones from earlier plus one for the auction that was added on the day, next to what the logs show:

| durrrr assumed | The field |
|---|---|
| Blinds continue against a raise 45% (big blind) and 30% (small blind) of the time; other seats 15% | 35%, 18% and 13% |
| A raise is re-raised 7% of the time | 8.3% for the median bot; 20% for the top ten |
| Bettors bluff at a balanced rate for their size | 11% bluffs at 1/2 to 3/4 of the pot on the river; 4–5% all-in |
| Players call all-ins at equilibrium widths | About half of that when short: heads-up, big blinds called 18–26% where 28–54% is balanced |
| Bots pay about 45 flop-chips at all-in auctions | 81 for the median bot; 90 for the top ten |
| Players fold to 50% of bets, and bet 45% of the times they are checked to | 52% and 47% |

The averages were about right: the field folded to 52% of bets where I'd assumed 50%, and re-raised 8.3% of raises where I'd assumed 7%. What was wrong was the shape behind them: who bluffs, at which size, and how hard the field defends. Four findings follow, roughly in order of what each one cost.

### Finding 1: bettors bluffed far less than a balanced rate

Start with one hand, because the whole problem is in it.

It's the first hand of a table in the last round, the round that counts thirteen times the first. durrrr opens king-ten and calls a re-raise. The shared cards come A-K-3-6-5, so durrrr has a pair of kings: second pair, losing to anyone who holds an ace. Its opponent bets 152 chips, and durrrr calls. Then 513, and durrrr calls. Then all-in for 1,150, and durrrr calls.

The bettor had ace-three. durrrr finished 8th, on hand one.

Why call three times with second pair? Because that pair of kings beats 76% of the hands an opponent could hold, and durrrr's model said that was enough.

**What I expected.** The two lines from before the contest: a bettor's range is value hands plus bluffs, with the bluffs at the balanced share for the bet's size. Against a bet of 3/4 of the pot, that is about 30% bluffs.

**What the logs showed.** On the river, every bet that gets called is shown, so I could count what bettors actually held:

<figure class="nl-chart">
<div class="nl-legend nl-label"><span class="nl-key is-dot nl-top">Balanced: what durrrr assumed</span><span class="nl-key is-dot nl-us">The field's bets</span></div>
<div class="nl-rows is-two" role="img" aria-label="Share of river bets that were bluffs, balanced against the field: 1/3 pot: balanced 20.0%, field 28.3%; 2/3 pot: balanced 28.6%, field 10.9%; Pot: balanced 33.3%, field 5.5%; All-in, pot: balanced 33.3%, field 3.0%.">
<span class="nl-label">River bet</span><span class="nl-label">Share of bets that were bluffs</span>
<span class="nl-name">1/3 pot</span><span class="nl-track is-dumb"><span class="nl-link" style="--lo:44.44;--hi:62.89"></span><span class="nl-dot nl-tip nl-top is-left" style="--x:44.44" data-tip="20.0% · balanced, what durrrr assumed"><span class="nl-v">20.0%</span></span><span class="nl-dot nl-tip nl-us is-right" style="--x:62.89" data-tip="28.3% · the field's bets"><span class="nl-v">28.3%</span></span></span>
<span class="nl-name">2/3 pot</span><span class="nl-track is-dumb"><span class="nl-link" style="--lo:24.22;--hi:63.56"></span><span class="nl-dot nl-tip nl-top is-right" style="--x:63.56" data-tip="28.6% · balanced, what durrrr assumed"><span class="nl-v">28.6%</span></span><span class="nl-dot nl-tip nl-us is-left" style="--x:24.22" data-tip="10.9% · the field's bets"><span class="nl-v">10.9%</span></span></span>
<span class="nl-name">Pot</span><span class="nl-track is-dumb"><span class="nl-link" style="--lo:12.22;--hi:74.00"></span><span class="nl-dot nl-tip nl-top is-right" style="--x:74.00" data-tip="33.3% · balanced, what durrrr assumed"><span class="nl-v">33.3%</span></span><span class="nl-dot nl-tip nl-us is-left" style="--x:12.22" data-tip="5.5% · the field's bets"><span class="nl-v">5.5%</span></span></span>
<span class="nl-name">All-in, pot</span><span class="nl-track is-dumb"><span class="nl-link" style="--lo:6.67;--hi:74.00"></span><span class="nl-dot nl-tip nl-top is-right" style="--x:74.00" data-tip="33.3% · balanced, what durrrr assumed"><span class="nl-v">33.3%</span></span><span class="nl-dot nl-tip nl-us is-left" style="--x:6.67" data-tip="3.0% · the field's bets"><span class="nl-v">3.0%</span></span></span>
<span></span><span class="nl-ticks nl-label" aria-hidden="true"><span style="--x:0">0%</span><span style="--x:22.2222">10%</span><span style="--x:44.4444">20%</span><span style="--x:66.6667">30%</span><span style="--x:88.8889">40%</span></span>
</div>
<details class="nl-data"><summary>Numbers</summary>
<div class="table"><table>
<thead><tr><th>River bet</th><th style="text-align:right">Balanced</th><th style="text-align:right">The field</th></tr></thead>
<tbody>
<tr><td>1/3 pot</td><td style="text-align:right">20.0%</td><td style="text-align:right">28.3%</td></tr>
<tr><td>2/3 pot</td><td style="text-align:right">28.6%</td><td style="text-align:right">10.9%</td></tr>
<tr><td>Pot</td><td style="text-align:right">33.3%</td><td style="text-align:right">5.5%</td></tr>
<tr><td>All-in, pot</td><td style="text-align:right">33.3%</td><td style="text-align:right">3.0%</td></tr>
</tbody></table></div>
</details>
<figcaption>Bluffs (hands that beat fewer than 60% of random hands) in river bets that were called and shown down, by bet size, against the share a balanced bettor would use: the price the bet offers. Only the small bets were bluffier than balance.</figcaption>
</figure>

A pot-sized river bet was a bluff 5.5% of the time. I had assumed 33.3%, six times as many. For an all-in of about the pot, the real share was 3.0%. Small bets were the one place the field bluffed more than balance. (On the flop and the turn the shown hands lean toward bets that were called all the way down, so I trust those streets less.)

**Why it mattered.** durrrr called a lot: 5.2 times a table after the flop, against the top ten's 2.1. Valued against folding, its calls lost 1.67 points a table. The top ten's won 1.93.

<figure class="nl-chart">
<div class="nl-rows" role="img" aria-label="Points a table that durrrr's postflop calls were worth against folding, by hand strength: Under 40% +0.07; 40–60% −0.36; 60–80% −2.23; 80–92% −1.68; 92–97% +0.99; 97% or more +1.54. Altogether −1.67.">
<span class="nl-label">Hand beat</span><span class="nl-label">Against folding</span><span class="nl-label nl-num">Points a table</span>
<span class="nl-name">Under 40%</span><span class="nl-track" style="--z:55.56%"><span class="nl-zero"></span><span class="nl-bar nl-tip is-pos" style="--w:1.53" data-tip="+0.07 points a table · 0.22 calls a table"></span></span><span class="nl-num">+0.07</span>
<span class="nl-name">40–60%</span><span class="nl-track" style="--z:55.56%"><span class="nl-zero"></span><span class="nl-bar nl-tip is-neg" style="--w:8.02" data-tip="−0.36 points a table · 0.78 calls a table"></span></span><span class="nl-num">−0.36</span>
<span class="nl-name">60–80%</span><span class="nl-track" style="--z:55.56%"><span class="nl-zero"></span><span class="nl-bar nl-tip is-neg" style="--w:49.58" data-tip="−2.23 points a table · 1.65 calls a table"></span></span><span class="nl-num">−2.23</span>
<span class="nl-name">80–92%</span><span class="nl-track" style="--z:55.56%"><span class="nl-zero"></span><span class="nl-bar nl-tip is-neg" style="--w:37.29" data-tip="−1.68 points a table · 1.62 calls a table"></span></span><span class="nl-num">−1.68</span>
<span class="nl-name">92–97%</span><span class="nl-track" style="--z:55.56%"><span class="nl-zero"></span><span class="nl-bar nl-tip is-pos" style="--w:22.07" data-tip="+0.99 points a table · 0.73 calls a table"></span></span><span class="nl-num">+0.99</span>
<span class="nl-name">97% or more</span><span class="nl-track" style="--z:55.56%"><span class="nl-zero"></span><span class="nl-bar nl-tip is-pos" style="--w:34.29" data-tip="+1.54 points a table · 0.18 calls a table"></span></span><span class="nl-num">+1.54</span>
</div>
<details class="nl-data"><summary>Numbers</summary>
<div class="table"><table>
<thead><tr><th>Hand beat</th><th style="text-align:right">Calls a table</th><th style="text-align:right">Points a table</th></tr></thead>
<tbody>
<tr><td>Under 40%</td><td style="text-align:right">0.22</td><td style="text-align:right">+0.07</td></tr>
<tr><td>40–60%</td><td style="text-align:right">0.78</td><td style="text-align:right">−0.36</td></tr>
<tr><td>60–80%</td><td style="text-align:right">1.65</td><td style="text-align:right">−2.23</td></tr>
<tr><td>80–92%</td><td style="text-align:right">1.62</td><td style="text-align:right">−1.68</td></tr>
<tr><td>92–97%</td><td style="text-align:right">0.73</td><td style="text-align:right">+0.99</td></tr>
<tr><td>97% or more</td><td style="text-align:right">0.18</td><td style="text-align:right">+1.54</td></tr>
<tr><td>All</td><td style="text-align:right">5.19</td><td style="text-align:right">−1.67</td></tr>
</tbody></table></div>
</details>
<figcaption>What durrrr's calls after the flop were worth against folding, in points per table, by how strong its hand was when it called: the share of random hands it beat. Altogether −1.67 points a table.</figcaption>
</figure>

The strong hands paid for themselves; the middle ones paid for everyone else:

| durrrr's hand beat | Flop | Turn | River |
|---|---|---|---|
| 60–80% of hands | −0.89 (won 40%) | −1.88 (won 26%) | −1.62 (won 20%) |
| 80–92% | −1.79 (34%) | −1.08 (36%) | +1.04 (41%) |
| 92–97% | +0.03 (47%) | +2.57 (57%) | +6.13 (70%) |

*Points per call against folding; in brackets, how often the call won at showdown.*

They cost most early: with seven or eight players left these calls lost 1.04 points each, 2.3 points a table. Against a bet of 15 big blinds or more, durrrr called with a weak pair 69% of the time on the turn and won 14% of those showdowns; on the river it called 57% of the time and won 8%.

Put the model next to the logs. durrrr called a 3/4-pot bet with any hand that beat 70 to 75% of hands, and a bet of 2.5 times the pot with 76 to 82%, while in the logs a call only paid from about 92% on the flop and turn, and from 80% on the river (92% against a pot-sized or all-in bet). You can try both side by side:

<post-demo src="call.js" title="Call or fold?" wide>
Pick a street, a bet size and a hand. The upper bar is how often durrrr's model put such a hand ahead of the bettor; the lower, how often it beat what the field actually bet, from bets that were called and shown down. On the river a call pays when it is ahead more often than the price; before the river, more cards and bets are to come, so the last line shows what durrrr's own calls in that spot won.
</post-demo>

A second mistake is stacked on the first. durrrr judged these calls in chips, and only switched to tournament points for all-ins. With points only for the top three, losing a third of a stack early costs more in points than the chips suggest, so chip-based thresholds call too often early in a table, whatever the bluff rate.

### Finding 2: the field folded to re-raises, and durrrr called instead

The same thing happened before the flop, in a different form.

**What I expected.** That a raise gets re-raised 7% of the time, and that the blinds continue against a raise (call it or re-raise it) 45% of the time from the big blind and 30% from the small blind.

**What the logs showed.** The blinds continued 35% and 18% of the time. The median bot re-raised 8.3% of raises, close to my 7%, but the top ten re-raised 20%. And re-raising worked, because the field gave up: the median bot folded to 66% of re-raises, and a re-raise from the big blind with no equity at all breaks even at 62%.

This is how durrrr and the top ten answered a single raise with 25 big blinds or more:

| Seat | Who | Fold | Call | Re-raise | Points per hand |
|---|---|---|---|---|---|
| Big blind | durrrr | 33% | 57% | 10% | −0.19 |
| | Top ten | 45% | 20% | 35% | +0.01 |
| Small blind | durrrr | 72% | 20% | 8% | −0.08 |
| | Top ten | 78% | 4% | 19% | +0.03 |
| Other seats | durrrr | 81% | 14% | 6% | +0.03 |
| | Top ten | 88% | 3% | 9% | +0.09 |

The best bots played these spots as raise or fold. durrrr called: 7.0 flat calls a table (plain calls, where a re-raise was possible), worth 0.48 points less than folding, where the top ten's 2.7 were worth 0.77 more.

**Why it mattered.** The code says why it called:

```python
if strength >= 1 - width * VALUE_RERAISE_SHARE:
    return ("raise", RERAISE_SIZE * state.current_bet)
# ...
if equity_vs_range(state.hole, width) * realize >= price + CALL_EDGE:
    return ("call", 0)
return ("fold", 0)
```

It re-raised only for value, never as a bluff, and against a field that folded to 66% of re-raises that gave up a lot. A flat call is also where most of the trouble in Finding 1 began: pots played out of position (acting first, which is a disadvantage), often several ways, where middle hands meet bets.

The same pattern shows up with a shorter stack. With 15 to 25 big blinds, the top ten moved all-in over a raise 28% of the time from the big blind, 17.5% from the small blind and 8.6% from the other seats, each all-in worth 0.65 to 1.06 points. durrrr did it 2%, 0.5% and 0.1% of the time. Its short-stack mode begins at 15 big blinds (`PUSH_FOLD_BB = 15`), and above that a raise gets the normal answer, which never moves all-in. All their all-ins together were worth 4.3 points a table to durrrr's 2.2. Among the aggressive bots, how often a bot moved all-in at 15 to 25 big blinds predicted its score better than any other single habit.

The default behind that one was "players call all-ins at equilibrium widths". When short, they called about half that often, and the field folded to 79% of all-ins over a raise, where a 15 bb all-in with no equity breaks even at 78%. (What those all-ins earned the top ten is an observation. What they would have earned durrrr is an estimate.)

### Finding 3: the field folded to bets, and durrrr rarely made them

**What I expected.** That players fold to 50% of bets. For comparison, a balanced defender folds to at most 33 to 43% of bets of 1/2 to 3/4 of the pot, and to 50% of pot-sized ones.

**What the logs showed.** As an average, my default was close: the median bot folded to 52% of bets after the flop. Now look at it by size. Heads-up, a bet of 1/2 to 3/4 of the pot took the pot at once 54% of the time on the flop and 51% on the river, a pot-sized river bet 64%, and a bet bigger than the pot 77%. A pure bluff of 3/4 of the pot needs 43%. (The turn, at 43%, was about even.)

**Why it mattered.** durrrr hardly ever tested this. It bet the river 25% of the times it was checked to, against the top ten's 40%, and with a weak hand 0.3% of the time. It never bet more than 0.8 of the pot, and 93 to 96% of its raises after the flop were near-nuts. As the raiser before the flop it won 1.35 pots a table without a showdown, the top ten 2.36: 1.3 points a table between them.

Two caveats before reading that as free money. Some of this folding is tournament pressure: with points only for the top three, folding middle hands early is partly right (which is exactly why durrrr's chip-based thresholds were wrong). And bluffs should be aimed: 9% of the bots folded to fewer than 30% of bets, 12% to more than 70%, and with anonymous seats a bot can only learn which is which within a table. The fold rates are observations; that durrrr's bluffs would have collected the same folds is an estimate.

### Finding 4: the auction was under-spent, even while I was tuning it

**What I expected.** That bots pay about 45 flop-chips at an auction where someone is all-in.

**What the logs showed.** 81 for the median bot, and 90 for the top ten.

**Why it mattered.** In heads-up auctions durrrr paid 25 flop-chips when there was betting still to come, against its opponents' 36; when someone was all-in, 49 against 90. It ended its tables with 520 of its 1,000 flop-chips unspent (the top ten: 305; the median bot: 442), and unspent chips are worth nothing. Spending matters most in all-in pots, where the flop is the last decision anyone makes: across the field, outbidding the other player by 30 chips or more added about ten points to a hand's chance of winning. In their heads-up all-ins the top ten turned 48.3% of card equity into 51.6% of wins; durrrr turned 49.5% into 49.9%.

The auction was the part I kept tuning during the contest, and durrrr still trailed the field in it.

### So who was the field?

I had expected strong and balanced. Balanced was wrong. So what did the 193 other bots actually play? I sorted every bot in every round by how many hands it played, how many of those it raised, and how often it moved all-in with a deep stack:

<figure class="nl-chart">
<div class="nl-rows" role="img" aria-label="The field by style, share of bots and average points a table: Tight-aggressive 46.5%, 13.2 points; Loose-aggressive 34.6%, 13.8 points; Loose-passive 6.9%, 5.5 points; Nit 5.4%, 8.8 points; Tight-passive 3.5%, 7.9 points; Always-fold 2.3%, 6.2 points; All-in maniac 0.6%, 3.8 points; Jam-or-fold 0.2%, 7.2 points.">
<span class="nl-label">Style</span><span class="nl-label">Share of bots</span><span class="nl-label nl-num">Points</span>
<span class="nl-name">Tight-aggressive</span><span class="nl-track"><span class="nl-bar nl-tip is-rank nl-us" style="--w:77.50" data-tip="46.5% of bots · 13.2 points a table"><span class="nl-v">46.5%</span></span></span><span class="nl-num">13.2</span>
<span class="nl-name">Loose-aggressive</span><span class="nl-track"><span class="nl-bar nl-tip is-rank nl-us" style="--w:57.67" data-tip="34.6% of bots · 13.8 points a table"><span class="nl-v">34.6%</span></span></span><span class="nl-num">13.8</span>
<span class="nl-name">Loose-passive</span><span class="nl-track"><span class="nl-bar nl-tip is-rank nl-us" style="--w:11.50" data-tip="6.9% of bots · 5.5 points a table"><span class="nl-v">6.9%</span></span></span><span class="nl-num">5.5</span>
<span class="nl-name">Nit</span><span class="nl-track"><span class="nl-bar nl-tip is-rank nl-us" style="--w:9.00" data-tip="5.4% of bots · 8.8 points a table"><span class="nl-v">5.4%</span></span></span><span class="nl-num">8.8</span>
<span class="nl-name">Tight-passive</span><span class="nl-track"><span class="nl-bar nl-tip is-rank nl-us" style="--w:5.83" data-tip="3.5% of bots · 7.9 points a table"><span class="nl-v">3.5%</span></span></span><span class="nl-num">7.9</span>
<span class="nl-name">Always-fold</span><span class="nl-track"><span class="nl-bar nl-tip is-rank nl-us" style="--w:3.83" data-tip="2.3% of bots · 6.2 points a table"><span class="nl-v">2.3%</span></span></span><span class="nl-num">6.2</span>
<span class="nl-name">All-in maniac</span><span class="nl-track"><span class="nl-bar nl-tip is-rank nl-us" style="--w:1.00" data-tip="0.6% of bots · 3.8 points a table"><span class="nl-v">0.6%</span></span></span><span class="nl-num">3.8</span>
<span class="nl-name">Jam-or-fold</span><span class="nl-track"><span class="nl-bar nl-tip is-rank nl-us" style="--w:0.33" data-tip="0.2% of bots · 7.2 points a table"><span class="nl-v">0.2%</span></span></span><span class="nl-num">7.2</span>
</div>
<details class="nl-data"><summary>Numbers</summary>
<div class="table"><table>
<thead><tr><th>Style</th><th style="text-align:right">Share of bots</th><th style="text-align:right">Points a table</th></tr></thead>
<tbody>
<tr><td>Tight-aggressive</td><td style="text-align:right">46.5%</td><td style="text-align:right">13.2</td></tr>
<tr><td>Loose-aggressive</td><td style="text-align:right">34.6%</td><td style="text-align:right">13.8</td></tr>
<tr><td>Loose-passive</td><td style="text-align:right">6.9%</td><td style="text-align:right">5.5</td></tr>
<tr><td>Nit</td><td style="text-align:right">5.4%</td><td style="text-align:right">8.8</td></tr>
<tr><td>Tight-passive</td><td style="text-align:right">3.5%</td><td style="text-align:right">7.9</td></tr>
<tr><td>Always-fold</td><td style="text-align:right">2.3%</td><td style="text-align:right">6.2</td></tr>
<tr><td>All-in maniac</td><td style="text-align:right">0.6%</td><td style="text-align:right">3.8</td></tr>
<tr><td>Jam-or-fold</td><td style="text-align:right">0.2%</td><td style="text-align:right">7.2</td></tr>
</tbody></table></div>
</details>
<figcaption>Every bot in every round (1,155 in all) by its style, with the style's average points per table. Always-fold bots play under 5% of hands, nits 5 to 13%. Passive bots call more than they raise. Tight- and loose-aggressive bots raise or fold, with under or over 27% of hands. All-in maniacs move all-in with 15% of hands even 50 big blinds deep; jam-or-fold bots make most of their raises all-in.</figcaption>
</figure>

Most of the field was neither wild nor passive: 81% were raise-or-fold bots, tight or loose. The radical ones were rare: 2.3% folded nearly everything, 0.6% moved all-in all the time (and finished last half the time). Passive bots, which call more than they raise, made up 10% (the calling stations and limpers alone 7%), and fed everyone. Within the raise-or-fold majority there were four kinds:

| Kind | Share of bots | Points per table | Re-raise a raise | Cold-call a raise | All-in at 15–25 bb | Big blind folds to a raise | Fold to a bet |
|---|---|---|---|---|---|---|---|
| Hyper-aggressive re-raisers | 14% | 15.7 | 24% | 8% | 16% | 45% | 57% |
| Solid | 30% | 14.3 | 13% | 9% | 11% | 64% | 51% |
| Passive-leaning callers | 18% | 11.9 | 5% | 17% | 4% | 60% | 55% |
| Tight fit-or-fold | 23% | 11.2 | 7% | 8% | 4% | 77% | 46% |

By its own numbers durrrr belongs with the passive-leaning callers: next to the aggressive bots it cold-called raises (called them with nothing invested yet) three standard deviations more often, and folded its big blind and folded to re-raises two less. A bot built to be hard to exploit had ended up among the callers.

All-ins in this field were about stack size, not temperament. With 50 big blinds or more the field moved all-in on 1.3% of hands (62% of bots on fewer than 1%), with 15 to 25 on 7.5%, and under 8 on 16.5%; by players left, from 1.6% of hands at a full table to 18% heads-up. A typical hand for a typical bot was a fold before the flop (71%); then came raising and taking the pot or folding to a re-raise (10.6%), a flop with betting to come (9.8%), an all-in nobody called (3.5%), and an all-in before the flop against a caller (2.9%). The median bot played 26.5% of its hands, raised with 20%, re-raised 8% of the raises it faced, and folded to 52% of bets after the flop.

The field also hardened as the rounds went on. From the first round to the last, the median bot's re-raise rate went from 4.0% to 9.6% and its all-in rate at 15 to 25 big blinds from 2.6% to 8.1%; what the field paid at all-in auctions went from 72 flop-chips to 103; bots that folded everything went from 5.8% of the field to 0.5%. durrrr's profit from the hands it raised that ended before the flop fell from 3.4 points a table to 2.1.

Against the aggressive bots, 44% of the field, durrrr only broke even, and they knocked it out 58% of the times it went out; all of its profit came from the passive 56%. At a table with at most one aggressive opponent it averaged about 17 points, with six or more 11.8. But its rate of finishing 7th or 8th stayed between 31% and 35% whoever it sat with. Those exits were its own doing.

### What held up

Some of durrrr worked. Calling all-ins was worth 0.7 to 2.9 points a call (only the middle pairs, sevens to nines, lost a little). Calling re-raises came out about even. And short-handed play, as the tables above showed, was nearly as good as the best. durrrr's trouble was at the start of a table, never at the end.

The best bots weren't playing equilibrium either. They won by running the exploits in these findings, and they had a weak spot of their own: the all-in over a raise, which they made with about two thirds of their hands. durrrr's calls against those won 55% of the time.

### What a different bot might have earned

Everything so far either happened or was valued against a fold. This part is estimate.

Nobody has solved this game. But any equilibrium has to meet conditions the logs can check: a bettor must bluff often enough that calling breaks even, and a defender must fold rarely enough that bluffing breaks even. The field broke both, in the same direction. It bluffed too little and folded too much. Spot by spot:

| Spot | Equilibrium-like reference | The field | The exploit |
|---|---|---|---|
| Bluffing | A bet of 1/2 to 3/4 of the pot carries 25–30% bluffs; bigger bets more | 11% at that size on the river; 4–5% for all-ins and raises | Fold middle hands to big bets and raises |
| Folding to bets | Fold to at most 33–43% of 1/2 to 3/4-pot bets, 50% of pot-sized ones | 54% on the flop, 51% on the river, 64% to a pot-sized river bet, 77% to an overbet | Bet and bluff more, and bigger, rivers included (the turn, at 43%, is about even) |
| Folding to re-raises | A re-raise from the big blind with no equity breaks even at 62% folds | 66% | Re-raise light from the blinds |
| Folding to all-ins over a raise | A 15 bb all-in with no equity breaks even at 78% folds | 79% | Move all-in over raises at 15–25 bb |
| Heads-up | At 6–15 bb the big blind should call an all-in with 28–54% of hands | 18–20% | Move all-in with almost anything |
| The blinds | An open of 2.5 bb with any two cards needs 62.5% folds | durrrr's opens won 61% outright | Open wider, late |
| Raises after the flop | Facing a range that is nearly all value, fold most hands | Folded to only 22–36% of raises, which were almost all value | Raise for value more; never bluff-raise the turn or river |
| Bet sizes | A bet's size should not give the hand away | Small bets were 28–38% air; big bets were strong | Call small bets, fold to big ones |
| The auction | Unspent flop-chips are worth nothing | The median bot ended with 442 of 1,000 | Spend them, above all in all-in pots |

The reference column is theory and the field column is observation. The exploit column is my reading of the two: what ought to make money against a field like this one, not something I have run.

The first item on my list of changes gets the conclusion to itself. The other five, in order of the points at stake:

2. **Count tournament points everywhere, not only all-in.** A call that risks a third of the stack with seven players left costs more in points than in chips.
3. **Re-raise or fold from the blinds**, and stop cold-calling raises.
4. **Move all-in over raises at 15 to 30 big blinds**, the band where the best bots made their points.
5. **Bet more, bet bigger, and bluff the river** against a field that folds too much, and aim the bluffs once a table shows who folds.
6. **Spend the flop-chips**, most of all when someone is all-in.

I can't put an honest number on what these would have earned. The logs show what the plays earned the bots that made them, which is what was available, not a forecast for durrrr. And I have one reminder from the day itself that a reasonable-looking exploit can lose when it's actually run: the raise rules from the sixth version.

### A note on the numbers

- **Where the points went:** each hand's change in a bot's points is credited to the line it played (folded, raised and won, called and lost at showdown, and so on), and the credits add up exactly to the score.
- **What bettors held:** hands shown at showdown, scored by the bot's own hand-strength count at the moment of the bet. On the river every called bet is shown, so that sample is fair; on earlier streets it leans toward bets that were called all the way down.
- **Styles:** thresholds on how many hands a bot played and raised and how often it moved all-in deep; the raise-or-fold majority split by k-means on 17 habits.

The order of the rounds is inferred, and all of it describes six rounds of one regional, not poker bots in general.

## Next time, I'd price calls from the logs

If I entered again, the first thing I'd change is those two lines from before the contest. Instead of assuming the balanced share of bluffs, durrrr should price each call against the hands the field actually showed for that street and bet size, and fold most middle hands to big bets and raises.

It's first on the list because it's where the points were. In this field a pot-sized river bet was a bluff 5.5% of the time, and durrrr's model said 33.3%. So it kept calling with hands like the pair of kings on hand one, and its calls after the flop lost 1.67 points a table against folding while the top ten's won 1.93. durrrr's own calls put up to 1.7 points a table on that one assumption.

It would also have been cheap to check. I built for the opponent I feared, a balanced one, so that durrrr would be hard to exploit. But how often the field bluffed was sitting in its hand histories, the same files I was already reading between rounds to tune the auction. Next time I'll model the field I meet, and test every default against the logs as soon as they arrive, starting with that one.
