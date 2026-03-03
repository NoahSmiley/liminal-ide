use serde::Serialize;

#[derive(Clone, Debug, Serialize)]
pub struct TodoItem {
    pub path: String,
    pub line_number: usize,
    pub kind: TodoKind,
    pub text: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum TodoKind {
    Todo,
    Fixme,
    Hack,
    Xxx,
}

impl TodoKind {
    pub fn from_tag(tag: &str) -> Option<Self> {
        match tag.to_uppercase().as_str() {
            "TODO" => Some(Self::Todo),
            "FIXME" => Some(Self::Fixme),
            "HACK" => Some(Self::Hack),
            "XXX" => Some(Self::Xxx),
            _ => None,
        }
    }

    pub fn all_patterns() -> &'static [&'static str] {
        &["TODO", "FIXME", "HACK", "XXX"]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn from_tag_todo_returns_some_todo() {
        assert!(matches!(TodoKind::from_tag("TODO"), Some(TodoKind::Todo)));
    }

    #[test]
    fn from_tag_case_insensitive() {
        assert!(matches!(TodoKind::from_tag("fixme"), Some(TodoKind::Fixme)));
        assert!(matches!(TodoKind::from_tag("Hack"), Some(TodoKind::Hack)));
        assert!(matches!(TodoKind::from_tag("xxx"), Some(TodoKind::Xxx)));
    }

    #[test]
    fn from_tag_unknown_returns_none() {
        assert!(TodoKind::from_tag("unknown").is_none());
        assert!(TodoKind::from_tag("").is_none());
        assert!(TodoKind::from_tag("NOTE").is_none());
    }

    #[test]
    fn all_patterns_returns_four_patterns() {
        assert_eq!(TodoKind::all_patterns().len(), 4);
    }

    #[test]
    fn todo_kind_serializes_to_uppercase() {
        let todo = serde_json::to_string(&TodoKind::Todo).unwrap();
        let fixme = serde_json::to_string(&TodoKind::Fixme).unwrap();
        let hack = serde_json::to_string(&TodoKind::Hack).unwrap();
        let xxx = serde_json::to_string(&TodoKind::Xxx).unwrap();
        assert_eq!(todo, "\"TODO\"");
        assert_eq!(fixme, "\"FIXME\"");
        assert_eq!(hack, "\"HACK\"");
        assert_eq!(xxx, "\"XXX\"");
    }
}
