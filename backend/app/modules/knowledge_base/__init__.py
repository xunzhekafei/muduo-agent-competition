"""知识库模块：笔记分块 → 向量化 → SQLite 向量库 → 语义检索（RAG MVP）。

- models.py    知识块表（含向量，provider 不可用时向量为空，降级关键词检索）
- indexer.py   增量索引（按内容 hash 跳过未变化的笔记）
- retriever.py 检索（语义余弦 + 关键词降级）
- routes.py    运维接口（重建索引 / 状态查询）
"""
