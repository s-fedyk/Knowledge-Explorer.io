from llama_index.core.prompts.base import PromptTemplate
from llama_index.core.prompts.prompt_type import PromptType

ENTITY_RERANKING_PROMPT = """
A list of entities is shown below. Each entity has a number next to it along 
with a description of the entity. A question is also provided.
Respond with the numbers of the entities 
you should use to answer the question, in order of relevance, as well 
as the relevance score. The relevance score is a number from 1-10 based on 
how relevant you think the entity is to the question.
Do not include any entities that are not relevant to the question.
Example format:
Entity 1:
<description of entity 1>

Entity 2:
<description of entity 2>

...

Entity 10:
<description of entity 10>

Question: <question>
Answer:
**Entity: 9, Relevance: 7**  
**Entity: 3, Relevance: 4**  
**Entity: 7, Relevance: 3**  

Let's try this now:

{context_str}
Question: {query_str}
Answer:
"""

RELATIONSHIP_RERANKING_PROMPT = """
A list of relationships is shown below. Each relationship has a number next to it along 
with a description of the relationship between entities. A question is also provided.
Respond with the numbers of the relationships 
you should use to answer the question, in order of relevance, as well 
as the relevance score. The relevance score is a number from 1-10 based on 
how relevant you think the relationship is to the question.
Do not include any relationships that are not relevant to the question.
Example format:
Relationship 1:
<description of relationship 1>

Relationship 2:
<description of relationship 2>

...

Relationship 10:
<description of relationship 10>

Question: <question>
Answer:
Rel: 9, Relevance: 7
Rel: 3, Relevance: 4
Rel: 7, Relevance: 3

Let's try this now:

{context_str}
Question: {query_str}
Answer:
"""

RERANKING_PROMPT = """
A list of items is shown below. Each item has an identifier, has a number next to it along 
with a summary of the item. A question is also provided. \n
Respond with the numbers of the documents 
you should consult to answer the question, in order of relevance, as well \n
as the relevance score. The relevance score is a number from 1-10 based on 
how relevant you think the document is to the question.\n
Do not include any items that are not relevant to the question. \n
If there are no relevant items, 
Example input: \n
<item 1 id>:\n<summary of item 1>\n\n
<item 2 id>:\n<summary of item 2>\n\n
...\n\n
<item 10>:\n<summary of item 10>\n\n
Question: <question>\n
Example output:\n
- <item 9 id>: Relevance: 7\n
- <item 3 id>: Relevance: 4\n
- <item 7 id>: Relevance: 3\n
Let's try this now, make sure you are outputting valid markdown: \n\n
{context_str}\n
Question: {query_str}\n
Answer:\n
"""

CHOICE_RERANKING_PROMPT = PromptTemplate(
    RERANKING_PROMPT, prompt_type=PromptType.CHOICE_SELECT
)

ENTITY_CHOICE_RERANKING_PROMPT = PromptTemplate(
    ENTITY_RERANKING_PROMPT, prompt_type=PromptType.CHOICE_SELECT
)

RELATIONSHIP_CHOICE_RERANKING_PROMPT = PromptTemplate(
    RELATIONSHIP_RERANKING_PROMPT, prompt_type=PromptType.CHOICE_SELECT
)
