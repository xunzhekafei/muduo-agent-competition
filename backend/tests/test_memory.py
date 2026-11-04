"""记忆模块测试 —— generator / library / scheduler"""

import unittest

from app.modules.memory.generator import _parse_json, _build_fallback_cards
from app.modules.memory.library import _ensure_aware, _guess_cycle
from app.modules.memory.service import MemoryService


class TestParseJson(unittest.TestCase):
    """generator.py — LLM 返回 JSON 解析"""

    def test_valid_json_array(self):
        result = _parse_json('[{"title":"测试","type":"概念定义"}]')
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["title"], "测试")

    def test_json_with_prefix_noise(self):
        result = _parse_json('好的，这是结果：[{"key":"val"}]')
        self.assertEqual(len(result), 1)

    def test_empty_string(self):
        self.assertEqual(_parse_json(""), [])

    def test_plain_text_no_json(self):
        self.assertEqual(_parse_json("这不是 JSON"), [])

    def test_nested_array(self):
        result = _parse_json('[{"a":1},{"b":2}]')
        self.assertEqual(len(result), 2)


class TestFallbackCards(unittest.TestCase):
    """generator.py — mock 模式下的兜底卡片生成"""

    def test_returns_cards_from_long_text(self):
        text = "第一句话很长很长很长很长。第二句话也很长很长很长很长。第三句话同样很长。"
        cards = _build_fallback_cards(text)
        self.assertGreater(len(cards), 0)
        for c in cards:
            self.assertIn("front", c)
            self.assertIn("back", c)
            self.assertIn("type", c)

    def test_short_text_returns_default(self):
        cards = _build_fallback_cards("短")
        self.assertGreater(len(cards), 0)

    def test_empty_text(self):
        cards = _build_fallback_cards("")
        self.assertGreater(len(cards), 0)


class TestDatetimeSafety(unittest.TestCase):
    """library.py — 时区安全处理"""

    def test_naive_becomes_aware(self):
        from datetime import datetime
        naive = datetime(2026, 6, 1, 12, 0, 0)
        aware = _ensure_aware(naive)
        self.assertIsNotNone(aware.tzinfo)

    def test_aware_stays_aware(self):
        from datetime import datetime, timezone
        aware = datetime(2026, 6, 1, 12, 0, 0, tzinfo=timezone.utc)
        result = _ensure_aware(aware)
        self.assertEqual(result, aware)


class TestCycleGuessing(unittest.TestCase):
    """library.py — 周期推测"""

    def _card(self, interval):
        from unittest.mock import MagicMock
        c = MagicMock()
        c.interval_days = interval
        return c

    def test_guess_standard(self):
        cards = [self._card(1), self._card(3), self._card(7)]
        self.assertEqual(_guess_cycle(cards), "standard")

    def test_guess_cram(self):
        cards = [self._card(1), self._card(2), self._card(4), self._card(7)]
        self.assertEqual(_guess_cycle(cards), "cram")  # first=1 + has 2 → cram

    def test_guess_standard_no_cram_marker(self):
        cards = [self._card(1), self._card(3), self._card(7)]
        self.assertEqual(_guess_cycle(cards), "standard")  # first=1 + no 2 → standard

    def test_empty_returns_none(self):
        self.assertIsNone(_guess_cycle([]))


class TestScheduler(unittest.TestCase):
    """service.py — SM-2 复习调度算法"""

    def setUp(self):
        self.svc = MemoryService.__new__(MemoryService)

    def test_good_multiplies_interval(self):
        interval, ease = self.svc._schedule(1, 2.5, None)
        self.assertGreater(interval, 1)

    def test_again_resets(self):
        from app.schemas.enums import ReviewGrade
        interval, ease = self.svc._schedule(10, 2.5, ReviewGrade.AGAIN)
        self.assertEqual(interval, 1)

    def test_easy_large_jump(self):
        from app.schemas.enums import ReviewGrade
        interval, ease = self.svc._schedule(1, 2.5, ReviewGrade.EASY)
        self.assertGreaterEqual(interval, 4)


if __name__ == "__main__":
    unittest.main()
